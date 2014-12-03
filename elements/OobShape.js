(function (window)
{
	/** Defines a shape in which no point can be placed */
	function OobShape (points){
		this.initialize(points);
	}
	var p = OobShape.prototype = new createjs.Container();
	p.Container_initialize = OobShape.prototype.initialize;
	p.Container_tick = p._tick;
	
	// CONSTANTS
	p.DEPTH = 30;
	p.OUTLINE_COLOR = "#886644";
	p.BORDER_COLOR = "#C8C8D0";
	p.INSIDE_COLOR = "#E0E0F2";
		
	// CONSTRUCTOR
	p.initialize = function (points){
		this.Container_initialize();
		this.unit = 0;
		// Private objects
		this.ishape = null, bshape = null;
		// this must be a triangle or greater
		if (points.length >= 3){
			this.points = points;
			redraw();
		} else
		{
			this.points = null;
		}
		//this.addEventListener(Event.ADDED, handleAdded);
		//}
		//function handleAdded(event:Event)
		//{
		//this.removeEventListener(Event.ADDED, handleAdded);
		unit = ShapeProductionTask.unit;
		this.DEPTH *= unit;	
	}
	
		/** This function is used the panel class to redraw from point to point */
	p.redraw = function(dp){
		var points = this.points;
		this.ready_to_update = true;
		if (this.bshape == null){
			this.bshape = new createjs.Sprite();
			this.bshape.mouseEnabled = false;
			this.addChild(this.bshape);
		}
		if (this.ishape == null){
			this.ishape = new Sprite();
			this.ishape.mouseEnabled = false;
			this.addChild(this.ishape);
		}
		// mins and maxs
		var minx=Number.MAX_VALUE, miny=Number.MAX_VALUE, maxx=Number.MIN_VALUE, maxy=Number.MIN_VALUE;
		var ipoints;
		
		// get min and max, put points on each corner
		for (var p in this.points){
			if (p.x < minx) minx = p.x;
			if (p.x > maxx) maxx = p.x;
			if (p.y < miny) miny = p.y;
			if (p.y > maxy) maxy = p.y;
		}
		
		
		var bcolors = ["#AA8866", "#CCAA88"]; 
		var icolors = ["#88AA66", "#AACC88"]; 
			
		//draw with respect to max and min
		this.bshape.graphics.clear();
		this.bshape.graphics.setStrokeStyle(2).beginFill(this.OUTLINE_COLOR);
		this.bshape.graphics.beginGradientFill(bcolors, [0, 1], minx, miny, maxx, maxy);
		this.bshape.graphics.moveTo(points[points.length-1].x, points[points.length-1].y); 
		
		for (p in this.points){
			this.bshape.graphics.lineTo(p.x, p.y); 
		}
		this.bshape.graphics.endFill();
		
		this.ishape.graphics.clear();
		this.ishape.graphics.setStrokeStyle(1).beginStroke(this.OUTLINE_COLOR);
		this.ishape.graphics.beginGradientFill(icolors, [0, 1], minx, miny, maxx, maxy);
		
		var c = MathUtilities.centroid(this.points);
		this.bshape.graphics.setStrokeStyle(1).beginStroke(this.OUTLINE_COLOR);
		
		var angToCentroid = MathUtilities.calcAngle(c, points[points.length-1]);
		this.ishape.graphics.moveTo(points[points.length-1].x+this.DEPTH*Math.sin(angToCentroid), points[points.length-1].y-this.DEPTH*Math.cos(angToCentroid)); 
		
		for (p in this.points){
			angToCentroid = MathUtilities.calcAngle(c, p);
			ishape.graphics.lineTo(p.x+this.DEPTH*Math.sin(angToCentroid), p.y-this.DEPTH*Math.cos(angToCentroid)); 
			// draw line on bshape from bpoint to ipoint
			bshape.graphics.moveTo(p.x, p.y);
			bshape.graphics.lineTo(p.x+this.DEPTH*Math.sin(angToCentroid), p.y-this.DEPTH*Math.cos(angToCentroid));				
		}
		ishape.graphics.endFill();		
	}

	p._tick = function(){
		this.Container_tick();
	}
	
	window.OobShape = OobShape;
}(window));