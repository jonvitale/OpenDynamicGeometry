(function (window)
{
	function DrawTool (drawPoints, oobshapes){
		this.initialize(drawPoints, oobshapes);
	}
	var p = DrawTool.prototype = new createjs.Container();
	p.Container_initialize = DrawTool.prototype.initialize;
	p.Container_tick = p._tick;
	
	// CONSTRUCTOR
	p.initialize = function (drawPoints, oobshapes){
		this.Container_initialize();
		this.drawPoints = drawPoints;
		this.oobshapes = oobshapes;
		this.mouseEnabled = false;
		this.mouseChildren = false;
		this.overDrawPoint = null;
		this.selectedDrawPoint = null;
		// private vars
		this.outOfBounds = false;
		this.background = new createjs.Shape();
		this.addChild(this.background);
		
		this.state = "drag";
		this.drawCursor();
		// go through each point and add event listener
		for (var i = 0; i < this.drawPoints.length; i++){
			var p = this.drawPoints[i];
			p.mouseEnabled = true;
			if(!p.hasEventListener("mouseover")) p.on("mouseover", this.handleMouseOverPoint);
		}
		for (var i = 0; i < this.oobshapes.length; i++){
			var oobshape = this.oobshapes[i];
			oobshape.on("mouseover", this.handleMouseOverOobShape);				
		}
		//this.addEventListener(Event.REMOVED, handleRemoved);		
	}
	
	/** Get currently selected */
	p.components = function(){
		if (this.selectedDrawPoint != null){
			return new Array(this.selectedDrawPoint);
		} else if (this.selectedDrawSegment != null){
			return new Array(this.selectedDrawSegment);
		} else {
			return null;
		}	
	}
	
	/** Mouse over should work for all points to highlight except currently selected, unless allow disconnected */
	p.handleMouseOverPoint = function(event){
		var overDrawPoint = this.overDrawPoint = event.currentTarget;
		overDrawPoint.removeEventListener("mouseover", this.handleMouseOverPoint);
		if (!overDrawPoint.pinned){
			overDrawPoint.enhance = true;
			overDrawPoint.on("mousedown", this.handleMouseDownPoint);	
			this.state = "drag-yes";
		} else {
			this.state = "drag-no";	
		}
		
		this.drawCursor();
		overDrawPoint.on("mouseout", handleMouseOutPoint);
	}
	p.handleMouseOutPoint= function(event){
		var overDrawPoint = this.overDrawPoint;
		overDrawPoint.removeEventListener("mouseout", this.handleMouseOutPoint);
		overDrawPoint.removeEventListener("mousedown", this.handleMouseDownPoint);
		overDrawPoint.enhance = false;
		if (this.dragging_point){
			this.state = "drag";
			this.drawCursor();
		}
		overDrawPoint.on("mouseover", this.handleMouseOverPoint);
		overDrawPoint = null;
	}
	/** The click handler either adds a new segment if another point is selected or selects this point if no point is selected */
	p.handleMouseDownPoint= function(event){
		var overDrawPoint = this.overDrawPoint;
		var selectedDrawPoint = this.selectedDrawPoint;
		overDrawPoint.removeEventListener("mousedown", this.handleMouseDownPoint);
					
		// If the point we are over is not selected, draw segment to it
		if (overDrawPoint != selectedDrawPoint){
			if (selectedDrawPoint != null) selectedDrawPoint.highlight = false;
			this.selectedDrawPoint = overDrawPoint;
			this.selectedDrawPoint.highlight = true;	
			////DrawingPanel(parent).selectPoint(overDrawPoint);				
		} 
		
		if (!selectedDrawPoint.pinned){ // no point is selected, so select this one 
			this.dragging_point = true;
			// we need to make this unenabled so that we can tell if we go over an oobshape
			selectedDrawPoint.mouseEnabled = false;				
		}		
		overDrawPoint.addEventListener("mouseup", this.handleMouseUpPoint);
	}
	
	/** For dragging of point in drag_mode */
	p.handleMouseUpPoint = function(event){
		var overDrawPoint = this.overDrawPoint;
		var selectedDrawPoint = this.selectedDrawPoint;
		overDrawPoint.addEventListener("mouseup", this.handleMouseUpPoint);
		this.dragging_point = false;
		selectedDrawPoint.mouseEnabled = true;
		if (overDrawPoint != null){
			overDrawPoint.addEventListener("mousedown", this.handleMouseDownPoint);				
		}
		selectedDrawPoint.highlight = false;	
		//GeometryGameItem(parent.parent).processCommand("drag", "in_progress", this);
		selectedDrawPoint = null;
	}
	
	/** This function is used the panel class to redraw from point to point */
	p.redraw = function(dp){
		this.ready_to_update = true;
	}

	p._tick = function(){
		this.Container_tick();
	}
	
	window.DrawTool = DrawTool;
}(window));
