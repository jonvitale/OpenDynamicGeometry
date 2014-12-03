(function (window)
{
	function PenTool (drawPoints, drawSegments, oobshapes, freePoints){
		this.initialize(drawPoints, drawSegments, oobshapes, freePoints);
	}
	var p = PenTool.prototype = new createjs.Container();
	p.Container_initialize = PenTool.prototype.initialize;
	p.Container_tick = p._tick;
	
	// CONSTRUCTOR
	p.initialize = function (drawPoints, drawSegments, oobshapes, freePoints){
		this.Container_initialize();
		this.freePoints = freePoints != null ? freePoints : -1;
		
		this.drawPoints = drawPoints;
		this.drawSegments = drawSegments;
		this.oobshapes = oobshapes;
		this.freePointsRemaining = freePoints; 
		this.mouseEnabled = false;
		this.mouseChildren = false;
		
		this.pwidth = 4*odGeometry.unit;
		this.pheight = 20*odGeometry.unit;
		this.pointsize = DrawPoint.prototype.POINT_SIZE*odGeometry.unit;
		this.enhancedsize = DrawPoint.prototype.ENHANCED_SIZE*odGeometry.unit;
		
		this.overDrawPoint = null;
		this.selectedDrawPoint = null;
		this.overDrawSegment = null;
		this.selectedDrawSegment = null;
		// private vars
		this.outOfBounds = false;
		this.background = new createjs.Shape();
		this.addChild(this.background);
		
		this.state = "pen";
		this.drawCursor();
		// go through each point and add event listener
		for (var i = 0; i < this.drawPoints.length; i++){
			var p = this.drawPoints[i];
			p.mouseEnabled = true;
			if(!p.hasEventListener("mouseover")) p.on("mouseover", this.handleMouseOverPoint);
		}
		for (var i = 0; i < this.drawSegments.length; i++){
			var s = this.drawSegments[i];
			s.mouseEnabled = true;
			if(!s.hasEventListener("mouseover")) s.on("mouseover", this.handleMouseOverSegment);
		}
		for (var i = 0; i < this.oobshapes.length; i++){
			var oobshape = this.oobshapes[i];
			oobshape.on("mouseover", this.handleMouseOverOobShape);				
		}
	}
	p.start = function(){
		
		if (!this.parent.hasEventListener("click")){
			 this.parent.on("click", function(event){
				// this is panel, need to call to function at this level
				this.cursor_tool.handleClickEmptyPanel.call(this.cursor_tool, event);
			 });
		}
		
		//this.on(Event.REMOVED, handleRemoved);	
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
		overDrawPoint.enhance = true;
		overDrawPoint.on("click", this.handleClickPoint);	
		this.state = "pen-yes";
		this.drawCursor();
		overDrawPoint.on("mouseout", handleMouseOutPoint);
	}
	p.handleMouseOutPoint= function(event){
		var overDrawPoint = this.overDrawPoint;
		overDrawPoint.removeEventListener("mouseout", this.handleMouseOutPoint);
		overDrawPoint.removeEventListener("click", this.handleClickPoint);
		overDrawPoint.enhance = false;
		this.state = "pen";
		this.drawCursor();
		overDrawPoint.on("mouseover", this.handleMouseOverPoint);
		overDrawPoint = null;
	}
	/** The click handler either adds a new segment if another point is selected or selects this point if no point is selected */
	p.handleClickPoint= function(event){
		var overDrawPoint = this.overDrawPoint;
		var selectedDrawPoint = this.selectedDrawPoint;
		overDrawPoint.removeEventListener("click", this.handleClickPoint);
					
		// There is a point selected, draw a new segment to the overpoint, or if overpoint is the same selected, (if allowed) deselect it
		if (selectedDrawPoint != null)
		{ // If the point we are over is not selected, draw segment to it
			if (overDrawPoint != selectedDrawPoint)
			{
				var s = this.parent.newSegment(selectedDrawPoint, this.overDrawPoint);
				s.mouseEnabled = true;
				s.on("mouseover", this.handleMouseOverSegment);
				if (selectedDrawPoint != null) selectedDrawPoint.highlight = false;
				this.selectedDrawPoint = overDrawPoint;
				this.selectedDrawPoint.highlight = true;					
				//this.dispatchEvent(new Event(Event.COMPLETE));
				//GeometryGameItem(parent.parent).processCommand("pen", "in_progress", this,new Array(selectedDrawPoint, this.freePointsRemaining));
			} else{  // If we are over the selected points, and we allow disconnected points, deselect it
				if (selectedDrawPoint != null) selectedDrawPoint.highlight = false;
				selectedDrawPoint = null;
			}
		} else{ // no point is selected, so select this one 
			selectedDrawPoint = this.overDrawPoint;
			selectedDrawPoint.highlight = true;					
		}		
	}
	/** Mouse over should work for all points to highlight except currently selected, unless allow disconnected */
	p.handleMouseOverSegment= function(event){
		var overDrawPoint = this.overDrawPoint;
		//trace("overDrawSegment", overDrawSegment);
		if (overDrawPoint == null){
			var overDrawSegment = this.overDrawSegment = event.currentTarget;
			overDrawSegment.removeEventListener("mouseover", this.handleMouseOverSegment);
			overDrawSegment.enhance = true;
			overDrawSegment.on("click", this.handleClickSegment);	
			this.state = "pen-yes";
			this.drawCursor();
			overDrawSegment.on("mouseout", this.handleMouseOutSegment);
		}
	}
	p.handleMouseOutSegment= function(event){
		var overDrawSegment = this.overDrawSegment;
		overDrawSegment.removeEventListener("mouseout", this.handleMouseOutSegment);
		overDrawSegment.removeEventListener("click", this.handleClickSegment);
		overDrawSegment.enhance = false;
		this.state = "pen";
		this.drawCursor();
		overDrawSegment.on("mouseover", this.handleMouseOverSegment);
		overDrawSegment = null;
	}
	/** The click handler adds a new point and splits the segment into two new segments, removing the old segment */
	p.handleClickSegment = function(event){
		var p;
		if (Math.abs(this.freePointsRemaining) > 0){
			var overDrawSegment = this.overDrawSegment;
			overDrawSegment.removeEventListener("click", this.handleClickSegment);
			// make sure we can delete this segment
			if(this.parent.deleteSegment(overDrawSegment, true)){
				if (selectedDrawPoint != null) selectedDrawPoint.highlight = false;
				var selectedDrawPoint = this.selectedDrawSegment = overDrawSegment;
				//GeometryGameItem(parent.parent).processCommand("delete", "in_progress", this,new Array(overDrawSegment, this.freePointsRemaining));
				
				// now add point
				p = this.parent.newPoint();
				// we only want to add a listener if we are in the segment mode, will erase in the point mode using a different means
				p.mouseEnabled = true;
				p.on("mouseover", handleMouseOverPoint);
				var _p = MathUtilities.intersectionPerpPoints({"x":parent.mouseX, "y":parent.mouseY}, overDrawSegment.point1.point(), overDrawSegment.point2.point());
				p.moveTo(_p.x, _p.y);
				var s = this.parent.newSegment(p, overDrawSegment.point1);
				s.mouseEnabled = true;
				s.on("mouseover", this.handleMouseOverSegment);
				// new segment
				s = this.parent.newSegment(p, overDrawSegment.point2);
				s.mouseEnabled = true;
				s.on("mouseover", this.handleMouseOverSegment);
				
				this.selectedDrawPoint = p;
				this.selectedDrawPoint.highlight = true;
				if (this.freePointsRemaining > 0) this.freePointsRemaining--;
				//GeometryGameItem(parent.parent).processCommand("pen", "in_progress", this,new Array(p, this.freePointsRemaining));
			}			
		}
	}
	/** If a point is selected draw a new point to this location, if a point is not selected just draw a new point */
	p.handleClickEmptyPanel= function(event){
		console.log("clicked here", event);
		var p;
		// overDrawPoint should be null be default here, but just checking
		// DRAW NEW POINT AND SEGMENT
		if (!this.outOfBounds && this.overDrawPoint == null && this.overDrawSegment == null && Math.abs(this.freePointsRemaining) > 0){
			var selectedDrawPoint = this.selectedDrawPoint;
			if (this.selectedDrawPoint != null ){
				p = this.parent.newPoint("no", false, false, false);
				// we only want to add a listener if we are in the segment mode, will erase in the point mode using a different means
				p.mouseEnabled = true;
				p.on("mouseover", this.handleMouseOverPoint);
				p.moveTo(parent.mouseX, parent.mouseY);
				var s = this.parent.newSegment(p, selectedDrawPoint);
				s.mouseEnabled = true;
				s.on("mouseover", this.handleMouseOverSegment);
				selectedDrawPoint.highlight = false;
				selectedDrawPoint = p;
				selectedDrawPoint.highlight = true;
			} else if (selectedDrawPoint == null)
			{ // overDrawPoint should still be null DRAW NEW POINT ONLY
				p = this.parent.newPoint();
				// we only want to add a listener if we are in the segment mode, will erase in the point mode using a different means
				p.mouseEnabled = true;
				p.on("mouseover", this.handleMouseOverPoint);
				p.moveTo(parent.mouseX, parent.mouseY);
				selectedDrawPoint = p;
				selectedDrawPoint.highlight = true;
			}
			//this.dispatchEvent(new Event(Event.COMPLETE));
			if (this.freePointsRemaining > 0) this.freePointsRemaining--;
			//GeometryGameItem(parent.parent).processCommand("pen", "in_progress", this, new Array(p, this.freePointsRemaining));
		}
	}
	
	// out of bounds objects
	p.handleMouseOverOobShape= function(event){
		event.currentTarget.removeEventListener("mouseover", handleMouseOverOobShape);
		this.outOfBounds = true;
		this.state = "pen-no";
		this.drawCursor();
		event.currentTarget.on("mouseout", this.handleMouseOutOobShape);
	}
	p.handleMouseOutOobShape= function(event){
		event.currentTarget.removeEventListener("mouseout", this.handleMouseOutOobShape);
		this.outOfBounds = false;
		this.state = "pen";
		this.drawCursor();
		event.currentTarget.on("mouseover", this.handleMouseOverOobShape);
	}
	
	/** Process moves cursor, looks for out of bounds 
		Was originally over-riding something
	*/
	p.process= function(point){			
		this.x = point.x;
		this.y = point.y;			
	}
	/** Draws a hand cursor to indicate the polygon being selected */
	p.drawCursor= function(){
		var pwidth = this.pwidth;
		var pheight = this.pheight;
		var pointsize = this.pointsize;
		switch (this.state){	
			case "pen":
				this.background.graphics.clear();
				// draw small circle
				this.background.graphics.beginFill("#AAAAAA");
				this.background.graphics.drawEllipse(-pointsize/2, -pointsize/2, pointsize, pointsize);
				this.background.graphics.endFill();
				// draw pen
				this.background.graphics.setStrokeStyle(pwidth/8).beginStroke("#444444");
				this.background.graphics.beginFill("#888888");
				this.background.graphics.moveTo(0,0);
				this.background.graphics.lineTo(pwidth/2,-pwidth);
				this.background.graphics.lineTo(-pwidth/2,-pwidth)
				this.background.graphics.lineTo(0,0);
				this.background.graphics.beginFill("#8888FF");
				this.background.graphics.moveTo(pwidth/2,-pwidth);
				this.background.graphics.lineTo(pwidth/2,-pheight);
				this.background.graphics.lineTo(-pwidth/2,-pheight);
				this.background.graphics.lineTo(-pwidth/2,-pwidth)
				this.background.graphics.endFill();
				// handle
				this.background.graphics.beginFill("#888888");
				this.background.graphics.drawEllipse(-pwidth/2,-pheight-pwidth/4,pwidth,pwidth/2);
				this.background.graphics.endFill();
				this.rotation=30;
				break;
			case "pen-yes":
				this.background.graphics.clear();
				this.background.graphics.setStrokeStyle(1).beginStroke("#000000");
				this.background.graphics.drawEllipse(-pointsize/2, -pointsize/4, pointsize, pointsize);
				// draw pen
				this.background.graphics.setStrokeStyle(pwidth/8).beginStroke("#444444");
				this.background.graphics.beginFill("#888888");
				this.background.graphics.moveTo(0,0);
				this.background.graphics.lineTo(pwidth/2,-pwidth);
				this.background.graphics.lineTo(-pwidth/2,-pwidth)
				this.background.graphics.lineTo(0,0);
				this.background.graphics.beginFill("#8888FF");
				this.background.graphics.moveTo(pwidth/2,-pwidth);
				this.background.graphics.lineTo(pwidth/2,-pheight);
				this.background.graphics.lineTo(-pwidth/2,-pheight);
				this.background.graphics.lineTo(-pwidth/2,-pwidth)
				this.background.graphics.endFill();
				// handle
				this.background.graphics.beginFill("#888888");
				this.background.graphics.drawEllipse(-pwidth/2,-pheight-pwidth/4,pwidth,pwidth/2);
				this.background.graphics.endFill();
				this.rotation=30;
				break;
			case "pen-no":
				this.background.graphics.clear();
				this.background.graphics.setStrokeStyle(1).beginStroke("#000000");
				this.background.graphics.drawEllipse(-pointsize/2, -pointsize/2, pointsize, pointsize);
				this.background.graphics.setStrokeStyle(2).beginStroke("#FF0000");
				this.background.graphics.moveTo(-pointsize/2*Math.sqrt(2)/2,-pointsize/2*Math.sqrt(2)/2);
				this.background.graphics.lineTo(pointsize/2*Math.sqrt(2)/2,pointsize/2*Math.sqrt(2)/2);
				this.background.graphics.moveTo(pointsize/2*Math.sqrt(2)/2,-pointsize/2*Math.sqrt(2)/2);
				this.background.graphics.lineTo(-pointsize/2*Math.sqrt(2)/2,pointsize/2*Math.sqrt(2)/2);
				// draw pen
				this.background.graphics.setStrokeStyle(pwidth/8).beginStroke("#444444");
				this.background.graphics.beginFill("#888888");
				this.background.graphics.moveTo(0,0);
				this.background.graphics.lineTo(pwidth/2,-pwidth);
				this.background.graphics.lineTo(-pwidth/2,-pwidth)
				this.background.graphics.lineTo(0,0);
				this.background.graphics.beginFill("#8888FF");
				this.background.graphics.moveTo(pwidth/2,-pwidth);
				this.background.graphics.lineTo(pwidth/2,-pheight);
				this.background.graphics.lineTo(-pwidth/2,-pheight);
				this.background.graphics.lineTo(-pwidth/2,-pwidth)
				this.background.graphics.endFill();
				// handle
				this.background.graphics.beginFill("#888888");
				this.background.graphics.drawEllipse(-pwidth/2,-pheight-pwidth/4,pwidth,pwidth/2);
				this.background.graphics.endFill();
				this.rotation=30;
				break;
		}
	}
	
	/** On removal unproject and unoutline */
	p.handleRemoved= function(event){
		var overDrawSegment = this.overDrawSegment;
		var selectedDrawSegment = this.selectedDrawSegment;
		var overDrawPoint = this.overDrawPoint;
		var selectedDrawPoint = this.selectedDrawPoint;
		
		this.removeEventListener(Event.REMOVED, handleRemoved);
		if (overDrawPoint != null){
			overDrawPoint.enhance = false;
			overDrawPoint.highlight = false;
		}
		if (selectedDrawPoint != null){
			selectedDrawPoint.enhance = false;
			selectedDrawPoint.highlight = false;
		}			
		if (overDrawSegment != null){
			overDrawSegment.enhance = false;
		}
		if (selectedDrawSegment != null){
			selectedDrawSegment.enhance = false;
		}	
			
		for (var i = 0; i < this.drawPoints.length; i++){
			var p = this.drawPoints[i];
			if(p.hasEventListener("mouseover")) p.removeEventListener("mouseover", this.handleMouseOverPoint);
			if(p.hasEventListener("mouseout")) p.removeEventListener("mouseout", this.handleMouseOutPoint);
			if(p.hasEventListener("click")) p.removeEventListener("click", this.handleClickPoint);
			p.mouseEnabled = false;
		}
		for (i = 0; i < this.drawSegments.length; i++){
			var s = this.drawSegments[i];
			if(s.hasEventListener("mouseover")) s.removeEventListener("mouseover", this.handleMouseOverSegment);
			if(s.hasEventListener("mouseout")) s.removeEventListener("mouseout", this.handleMouseOutSegment);
			if(s.hasEventListener("click")) s.removeEventListener("click", this.handleClickSegment);
			s.mouseEnabled = false;
		}
		for (i = 0; i < this.oobshapes.length; i++){
			var oobshape = this.oobshapes[i];
			if(oobshape.hasEventListener("mouseover")) oobshape.removeEventListener("mouseover", this.handleMouseOverOobShape);				
			if(oobshape.hasEventListener("mouseout")) oobshape.removeEventListener("mouseout", this.handleMouseOutOobShape);				
		}
		if (this.parent.hasEventListener("click")) this.parent.removeEventListener("click", this.handleClickEmptyPanel);
		
	}
	
	/** This function is used the panel class to redraw from point to point */
	p.redraw = function(dp){
		this.ready_to_update = true;
	}

	p._tick = function(){
		this.Container_tick();
	}
	
	window.PenTool = PenTool;
}(window));
