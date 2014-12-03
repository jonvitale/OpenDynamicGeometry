(function (window)
{
	function DrawPoint (id, pinned, fixed, auto_ppinned){
		this.initialize(id, pinned, fixed, auto_ppinned);
	}
	var p = DrawPoint.prototype = new createjs.Shape();
	p.Shape_initialize = DrawPoint.prototype.initialize;
	p.Shape_tick = p._tick;
	
	// CONSTANTS
	p.POINT_COLOR = ["#AAAAAA","#666666", "#333333"];
	p.HIGHLIGHT_COLOR = ["#FFFF44", "#EEEE00", "#DDDD00"];
	p.POINT_SIZE = 10;
	p.ENHANCED_SIZE = 16;
	p.PIN_SIZE = 6;
	p.PIN_COLOR = "#FFFFFF";
	p.PIN_FIXED_COLOR = "#FFFFFF";
	p.FIXED_COLOR = "#774400";
	p.PINNED_FIXED_COLOR = "#444444";
		
		
	// CONSTRUCTOR
	p.initialize = function (id, pinned, fixed, auto_ppinned){
		this.Shape_initialize();
		
		this.id = id != null ? id : "";
		this.pinned = pinned != null ? pinned : false;
		this.fixed = fixed != null ? fixed : false;
		this.auto_ppinned = auto_ppinned != null ? auto_ppinned : false;
		if (this.auto_ppinned && this.pinned && this.fixed){
			this.ppinned = true;
		} else {
			this.ppined = false;
		}
		this.highlighted = false;
		this.enhanced = false;
		
		this.pointsize = odGeometry.unit*this.POINT_SIZE;
		this.pinnedsize = odGeometry.unit*this.PIN_SIZE;
		this.enhancedsize = odGeometry.unit*this.ENHANCED_SIZE;
		
		// empty objects
		this.drawSegments = [];
		this.drawAngles = [];
		
		// draw
		//this.graphics.setStrokeStyle(2).beginStroke(this.POINT_COLOR);
		this.graphics.rf(this.POINT_COLOR,[0,.75, 1], 0, 0, 0, 0, 0, this.pointsize/2);
		this.graphics.drawEllipse(-this.pointsize/2, -this.pointsize/2, this.pointsize, this.pointsize);
		this.graphics.endFill();
		if (this.fixed){
			this.graphics.setStrokeStyle(1).beginStroke(this.POINT_COLOR[0]);
			this.graphics.drawEllipse(-this.fixedsize/2, -this.fixedsize/2, this.fixedsize, this.fixedsize);
			this.graphics.setStrokeStyle(1).beginStroke("#FFFFFF");
			this.graphics.drawEllipse(-this.fixedsize/4, -this.fixedsize/4, this.fixedsize/2, this.fixedsize/2);
		}
		this.redraw();
	}
	
		
	
	// getters and setters
	p.point = function (){
		return {x:this.x, y:this.y};
	}
	p.segmentcount = function(){
		return this.drawSegments.length;
	}
	
	p.enhance = function (b){
		this.enhanced = b;
		this.redraw();
	}
	
	p.highlight = function (b){
		this.highlighted = b;
		this.redraw();
	}
	
	p.pin = function (b){
		this.pinned = b;
		this.redraw();
	}
		
	// other functions
	p.toGeomPoints = function (arr){		
		var _gpoints = new Array();		
		for (var d in arr){
			if (d["x"] != null && d["y"] != null){
				_gpoints.push(new {x:d.x, y:d.y});
			} else {
				_gpoints.push(null);
			}
		}
		return _gpoints;
	}
	
	p.moveTo = function(_x, _y){
		if(this.parent != null){
			if (!this.pinned){
				if (this.parent.isValidPoint(_x, _y)){
					this.x = _x; this.y = _y;
					for (var s in this.drawSegments){
						s.redraw(this);
						
						for (var a in s.point1.drawAngles){
							a.redraw(this);
						}
						for (a in s.point2.drawAngles){
							a.redraw(this);
						}
					}
					return true;
				}
			}
		}
		return false;
	}
		
	
	/** Add GeoSegment */
	p.addSegment = function(s){
		if (this.drawSegments.length == 0 || this.drawSegments.indexOf(s) == -1){	
			this.drawSegments.push(s);
			return true;
		} else {
			return false;
		}
	}
	
	/** Remove a GeoSegment by reference */
	p.removeSegment = function(s){
		if (this.drawSegments.length >0 && this.drawSegments.indexOf(s) > -1){
			this.drawSegments.splice(this.drawSegments.indexOf(s),1);
			return true;
		} else {
			return false;
		}
	}
	
	p.redrawSegments = function(){
		for (var i=0; i < this.drawSegments.length; i++){
			this.drawSegments[i].redraw();
		}
	}
	
	p.addAngle = function (a){
		if (drawAngles.length == 0 || drawAngles.indexOf(a) == -1){	
			drawAngles.push(a);
			return true;
		} else {
			return false;
		}
	}
	p.removeAngle = function(a){
		if (drawAngles.length >0 && drawAngles.indexOf(a) > -1){
			drawAngles.splice(drawAngles.indexOf(a),1);
			return true;
		} else {
			return false;
		}
	}
	p.redrawAngles = function(){
		for (var i=0; i < drawAngles.length; i++){
			drawAngles[i].redraw();
		}
	}
	/*
	p.highlight = function(){
		if (!this.highlighted){
			this.highlighted = true;
			this.graphics.clear();
			//this.graphics.setStrokeStyle(2).beginStroke(this.POINT_COLOR);
			this.graphics.rf(this.HIGHLIGHT_COLOR,[0,.75,1], 0, 0, 0, 0, 0, this.pointsize/2);
			if (this.enhanced){
				this.graphics.drawEllipse(-this.enhancedsize/2, -this.enhancedsize/2, this.enhancedsize, this.enhancedsize);
			} else {
				this.graphics.drawEllipse(-this.pointsize/2, -this.pointsize/2, this.pointsize, this.pointsize);
			}
			this.graphics.endFill();
			if (fixed){
				this.graphics.setStrokeStyle(1).beginStroke(this.POINT_COLOR[0]);
				this.graphics.drawEllipse(-this.fixedsize/2, -this.fixedsize/2, this.fixedsize, this.fixedsize);
				this.graphics.setStrokeStyle(1).beginStroke("#FFFFFF");
				this.graphics.drawEllipse(-this.fixedsize/4, -this.fixedsize/4, this.fixedsize/2, this.fixedsize/2);
			}
					
			this.previoushighlight = this.currenthighlight;
			this.currenthighlight = "highlight";
				
		}
	}
	
	p.enhance = function(){
		if (!this.enhanced){
			this.enhanced = true;
			this.graphics.clear();
			//this.graphics.setStrokeStyle(2).beginStroke(this.POINT_COLOR);
			if (this.highlighted){
				this.graphics.rf(this.HIGHLIGHT_COLOR,[0, .75, 1], 0, 0, 0, 0, 0, this.enhancedsize/2);
			} else {
				this.graphics.rf(this.POINT_COLOR,[0, .75, 1], 0, 0, 0, 0, 0, this.enhancedsize/2);		
			}
			this.graphics.drawEllipse(-this.enhancedsize/2, -this.enhancedsize/2, this.enhancedsize, this.enhancedsize);
			this.graphics.endFill();
			if (this.fixed) {
				this.graphics.setStrokeStyle(1).beginStroke(this.POINT_COLOR[0]);
				this.graphics.drawEllipse(-this.fixedsize/2, -this.fixedsize/2, this.fixedsize, this.fixedsize);
				this.graphics.setStrokeStyle(1).beginStroke("#FFFFFF");
				this.graphics.drawEllipse(-this.fixedsize/4, -this.fixedsize/4, this.fixedsize/2, this.fixedsize/2);
			}
			this.previoushighlight = this.currenthighlight;
			this.currenthighlight = "enhance";
		}
	}
	
	p.unhighlight = function(){
		if (this.highlighted){
			this.highlighted = false;
			this.graphics.clear();
			//this.graphics.setStrokeStyle(2).beginStroke(this.POINT_COLOR);
			this.graphics.rf(this.POINT_COLOR,[0, .75, 1], 0, 0, 0, 0, 0, this.enhancedsize/2);
		
			if (this.enhanced){
				this.graphics.drawEllipse(-this.enhancedsize/2, -this.enhancedsize/2, this.enhancedsize, this.enhancedsize);
			} else {
				this.graphics.drawEllipse(-this.pointsize/2, -this.pointsize/2, this.pointsize, this.pointsize);
			}
			this.graphics.endFill();
			if (this.fixed){
				this.graphics.setStrokeStyle(2).beginStroke(this.POINT_COLOR[0]);
				this.graphics.drawEllipse(-this.fixedsize/2, -this.fixedsize/2, this.fixedsize, this.fixedsize);
				this.graphics.setStrokeStyle(1).beginStroke("#FFFFFF");
				this.graphics.drawEllipse(-this.fixedsize/4, -this.fixedsize/4, this.fixedsize/2, this.fixedsize/2);
			}
			this.previoushighlight = this.currenthighlight;
			this.currenthighlight = "none";
		}
	}		
	
	p.unenhance = function(){
		if (this.enhanced){
			this.enhanced = false;				
			this.graphics.clear();
			this.graphics.setStrokeStyle(2).beginStroke(this.POINT_COLOR);
			if (this.highlighted){
				this.graphics.rf(this.HIGHLIGHT_COLOR,[0, .75, 1], 0, 0, 0, 0, 0, this.pointsize/2);
			} else {
				this.graphics.rf(this.POINT_COLOR,[0, .75, 1], 0, 0, 0, 0, 0, this.pointsize/2);
			}
			this.graphics.drawEllipse(-this.pointsize/2, -this.pointsize/2, this.pointsize, this.pointsize);
				
			this.graphics.endFill();
			if (this.fixed){
				this.graphics.setStrokeStyle(1).beginStroke(this.POINT_COLOR[0]);
				this.graphics.drawEllipse(-this.fixedsize/2, -this.fixedsize/2, this.fixedsize, this.fixedsize);
				this.graphics.setStrokeStyle(1).beginStroke("#FFFFFF");
				this.graphics.drawEllipse(-this.fixedsize/4, -this.fixedsize/4, this.fixedsize/2, this.fixedsize/2);
			}
	
			this.previoushighlight = this.currenthighlight;
			this.currenthighlight = "none";
		}
	}
		
	p.setPreviousHighlight = function(){
		if (this.previoushighlight == "none"){
			this.unhighlight();
		} else if (this.previoushighlight == "highlight"){
			this.highlight();
		} else if (this.previoushighlight == "enhance"){
			this.enhance();
		}
	}
	*/
	//// Some functions for interaction
	/** This function finds the segment, from the array of segments, that is closest to perpendicular to the given segment 
	 * Used to select a segment for adjusting angle
	 */
	p.getRightestSegment = function(segment){
		var prevDeg = 180;
		var tsegment = null;
		for (var s in drawSegments)	{
			if (s != segment){
				var d = MathUtilities.calcAcuteRotation(segment.rotation, s.rotation);
				if (d < prevDeg){
					prevDeg = d;
					tsegment = s;
				}
			}
		}
		return tsegment;
	}
	
	p.getRightestAngle = function(segment){
		var prevDeg = 180;
		var tangle = null;
		for (var a in drawAngles){
			// is this segment a part of the current angle?
			if (a.segment1 == segment || a.segment2 == segment)
			{
				var d = MathUtilities.calcAcuteRotation(segment.rotation, a.otherDrawSegment(segment).rotation);
				if (d < prevDeg) {
					prevDeg = d;
					tangle = a;
				}
			}
		}
		return tangle;
	}
	
	p._tick = function(){
		this.Shape_tick();
	}

	p.redraw = function(){
		this.ready_to_update = true;
		if (this.highlighted){
			//console.log("in point redraw");
			this.graphics.clear();
			if (this.fixed) {
				this.graphics.setStrokeStyle(this.pointsize/5).beginStroke(this.FIXED_COLOR);
			} else {
				this.graphics.setStrokeStyle(this.pointsize/5).beginStroke(this.POINT_COLOR[0]);	
			}
			//this.graphics.setStrokeStyle(this.pointsize/5).beginStroke(HIGHLIGHT_COLOR);
			this.graphics.rf(this.HIGHLIGHT_COLOR,[0, .75, 1], 0, 0, 0, 0, 0, this.enhanced ? this.enhancedsize/2 : this.pointsize/2);
			if (this.enhanced) {
				this.graphics.drawEllipse(-this.enhancedsize/2, -this.enhancedsize/2, this.enhancedsize, this.enhancedsize);
			} else {
				this.graphics.drawEllipse(-this.pointsize/2, -this.pointsize/2, this.pointsize, this.pointsize);
			}
			this.graphics.endFill();
			if (this.pinned){
				this.graphics.setStrokeStyle(this.pinnedsize/12).beginStroke("#AAAA00");
				if (this.fixed){
					this.graphics.beginFill(this.PIN_FIXED_COLOR);
				} else {
					this.graphics.beginFill(this.PIN_COLOR);	
				}
				this.graphics.drawEllipse(-this.pinnedsize/2, -this.pinnedsize/2, this.pinnedsize, this.pinnedsize);
				this.graphics.endFill();
			}				
		} else {
			this.graphics.clear();
			if (this.pinned && this.fixed) {
				this.graphics.setStrokeStyle(this.pointsize/5).beginStroke(this.PINNED_FIXED_COLOR);
				this.graphics.beginFill(this.PINNED_FIXED_COLOR);
			} 
			else if (this.fixed){
				this.graphics.setStrokeStyle(this.pointsize/5).beginStroke(this.FIXED_COLOR);
				this.graphics.beginFill(this.FIXED_COLOR);
			} else {
				this.graphics.setStrokeStyle(this.pointsize/5).beginStroke(this.POINT_COLOR[0]);	
				this.graphics.rf(this.POINT_COLOR,[0, .75, 1], 0, 0, 0, 0, 0, this.enhanced ? this.enhancedsize/2 : this.pointsize/2);
			}
			if (this.enhanced){
				this.graphics.drawEllipse(-this.enhancedsize/2, -this.enhancedsize/2, this.enhancedsize, this.enhancedsize);
			} else {
				this.graphics.drawEllipse(-this.pointsize/2, -this.pointsize/2, this.pointsize, this.pointsize);
			}
			this.graphics.endFill();
			if (this.pinned)
			{
				this.graphics.setStrokeStyle(this.pinnedsize/6).beginStroke("#000000");
				if (this.fixed)
				{
					this.graphics.beginFill(this.PIN_FIXED_COLOR);
				} else
				{
					this.graphics.beginFill(this.PIN_COLOR);	
				}
				this.graphics.drawEllipse(-this.pinnedsize/2, -this.pinnedsize/2, this.pinnedsize, this.pinnedsize);
				this.graphics.endFill();
			}
		}	
	}

	window.DrawPoint = DrawPoint;
}(window));
