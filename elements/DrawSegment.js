(function (window)
{
	function DrawSegment (point1, point2, id, fixed){
		this.initialize(point1, point2, id, fixed);
	}
	var p = DrawSegment.prototype = new createjs.Container();
	p.Container_initialize = DrawSegment.prototype.initialize;
	p.Container_tick = p._tick;
	
	// CONSTANTS
	p.PARALLEL_DISCRIM_THRESH = 0.01; // The minimum difference (in degrees) that we adjust a line to match the slope of another line
	p.LENGTH_DISCRIM_THRESH = 0.2; //The minimum difference (in pixels) that we dilate a line to match the length of another line
	p.SEGMENT_COLOR = ["#CCCCCC","#AAAAAA","#888888","#AAAAAA","#CCCCCC"];
	p.OUTLINE_COLOR = "#0000FF";
	p.ENHANCE_COLOR = "#444444";
	p.FIXED_COLOR = "#774400";
	p.PINNED_COLOR = "#444444";
	p.BACK_HEIGHT = 20;
	p.SEGMENT_SIZE = 6;
		
	// CONSTRUCTOR
	p.initialize = function (point1, point2, id, fixed){
		this.Container_initialize();
		id = id != null ? id : "";
		fixed = fixed != null ? fixed : false;
		
		this.segmentsize = odGeometry.unit*this.SEGMENT_SIZE;
		this.point1 = point1;
		this.point2 = point2;
		this.id = id;
		this.fixed = fixed;
		this.point1.addSegment(this);
		this.point2.addSegment(this);
		this.outlined = false;
		this.enhanced = false;
		this.pinned = false;
		
		this.parallelPartners = [];
		this.congruentPartners = [];
		this.parallelCount = 0;
		this.congruentCount = 0;
		
		// add shapes
		this.backShape = new createjs.Shape();
		this.frontShape = new createjs.Shape();
			
		this.addChild(this.backShape);
		this.addChild(this.frontShape);
		
		this.congruentMarking = null;
		this.parallelMarking = null;
		
		this.redraw();
	}
	
	p.midpoint = function(){return {x:(this.point1.x+this.point2.x)/2, y:(this.point1.y+this.point2.y)/2};}
	p.length = function(){return Math.sqrt(Math.pow(this.point1.x-this.point2.x,2) + Math.pow(this.point1.y-this.point2.y,2));}
	p.endpoint1 = function(){return {x:this.point1.x, y:this.point1.y};}
	p.endpoint2 = function(){return {x:this.point2.x, y:this.point2.y};}
	// angle from endpoint2 to endpoint 1, 0 degrees is vertical , 90 is horizontal 
	p.angle = function(){return MathUtilities.calcAngle(this.endpoint2(), this.endpoint1());}
	p.rotation = function(){return MathUtilities.calcRotation(this.endpoint2(), this.endpoint1());}
	p.angleAbs = function(){return (MathUtilities.calcAngle(this.endpoint2(), this.endpoint1())+Math.PI)%Math.PI;}
	p.rotationAbs = function(){return (MathUtilities.calcRotation(this.endpoint2(), this.endpoint1())+180)%180;}
	
	/** Is this segment adjacent to the given segment (i.e., attached to the same draw point */
	p.isAdjacentTo = function(ds){
		if (this==ds) return false;
		if (this.point1 == ds.point1 || this.point1 == ds.point2 || this.point2 == ds.point1 || this.point2 == ds.point2){
			return true;
		} else {
			return false;
		}
	}	
		
	p.containsDrawPoint = function(drawpoint){
		if (drawpoint == this.point1 || drawpoint == this.point2){
			return true;
		} else {
			return false;
		}
	}
	
	p.containsPoint = function(point){
		if (point.x == this.point1.x && point.y == this.point1.y || point.x == this.point2.x && point.y == this.point2.y){
			return true;
		} else {
			return false;
		}
	}
	
	
	/** Returns whether we have reached threshold already 
	percent is 0 to 1
	*/
	p.rotateToDegrees = function(deg, percent, point){
		var d = percent*((deg+180)%180-this.rotationAbs());
		if (Math.abs(d) > this.PARALLEL_DISCRIM_THRESH){
			this.rotateDegrees(d, point);
			return false;
		} else {
			return true;
		}			
	}
	
	p.otherDrawPoint = function(drawpoint){
		if (drawpoint == this.point1){
			return this.point2;
		} else if (drawpoint == this.point2){
			return this.point1;
		} else {
			return null;
		}
	}
	
	p.otherPoint = function(point){
		if (point.x == this.point1.x && point.y == this.point1.y){
			return this.endpoint2();	
		} else if (point.x == this.point2.x && point.y == this.point2.y){
			return this.endpoint1();
		} else {
			return null;
		}
	}
	p.intersectsDrawSegment = function(ds, includeEndpoints){
		includesEndpoints = includesEndpoints != null ? includeEndpoints : false;
		if (this==ds){ return false; }
		return (this.intersectsBetweenPoints(ds.endpoint1(), ds.endpoint2(), includeEndpoints));	
	}
	/** Does this segment intersect with a given drawSegment (except at endpoints)? */
	p.intersectsBetweenDrawPoints = function(dp1, dp2, includeEndpoints){
		includesEndpoints = includesEndpoints != null ? includeEndpoints : false;
		return (this.intersectsBetweenPoints(dp1.point, dp2.point, includeEndpoints));			
	}
	/** Does this segment intersect with a given drawSegment (except at endpoints)? */
	p.intersectsBetweenPoints = function(p1, p2, includeEndpoints){
		includesEndpoints = includesEndpoints != null ? includeEndpoints : false;
		var ds1dp1 = this.point1.point;
		var ds1dp2 = this.point2.point;
		var ds2dp1 = p1;
		var ds2dp2 = p2;
		var m1 = MathUtilities.slopePoint(ds1dp1, ds1dp2);
		var m2 = MathUtilities.slopePoint(ds2dp1, ds2dp2);
		//trace(m1, m2);
		//trace(this==ds, ds1dp1.x, ds1dp2.x, ds2dp1.x, ds2dp2.x);
		if (m1 == m2){ return false; }
		else {
			var i = MathUtilities.intersectionSegments(ds1dp1,ds1dp2, ds2dp1, ds2dp2, includeEndpoints);
			//trace (i);
			if (i != null)
			{
				return true;
			} else
			{
				return false;
			}
		}
	}
	
	/** Checks to see if there is enough room to adjust, then adjusts */
	p.dilateTo = function(pixels, percent, dpoint){
		percent = percent != null ? percent : 1;
		var d;
		var length = this.length();
		if (Math.abs(pixels-length) > this.LENGTH_DISCRIM_THRESH)
		{				
			d = percent*(pixels-length);
			if(d!=0) this.dilate(d, dpoint);
			return true;
		} else
		{
			d = (pixels-length);
			if(d!=0) this.dilate(d, dpoint);
			return false;
		}
	}
	/** Dilate a number of pixels (technically should be a multiplier, but screw it) 
	 * point represents the point that is moving, if null then move both endpoints by half
	 * */
	p.dilate = function(pixels, dpoint){
		//dilate half from both ends.
		var _point1 = this.point1;
		var _point2 = this.point2;
		var p1 = this.endpoint1();
		var p2 = this.endpoint2();
		var p1n, p2n;
		if (dpoint == null){
			p1n = MathUtilities.calcPointDistFromPoints(pixels/2,p1,p2);
			p2n = MathUtilities.calcPointDistFromPoints(pixels/2,p2,p1);
		} else if (dpoint == point1){
			p1n = MathUtilities.calcPointDistFromPoints(pixels,p1,p2);
			p2n = p2;
		} else if (dpoint == point2){
			p2n = MathUtilities.calcPointDistFromPoints(pixels,p2,p1);
			p1n = p1;		
		} else {
			//trace("in drawsegment dilate,", dpoint.point, "needs to be a point of this segment, such as",p1,"or", p2); 
			return;
		}
		if (_point1.moveTo(p1n.x, p1n.y)){
			point1.redrawSegments();
			point1.redrawAngles();
		}
		if (_point2.moveTo(p2n.x, p2n.y)){
			point2.redrawSegments();
			point2.redrawAngles();
		}
		
	}
	/** Returns whether we have reached threshold already */
	p.rotateToDegrees = function(deg, percent, point){
		percent = percent != null ? percent : 1;
		deg = (deg+180)%180;
		var rotationAbs = this.rotationAbs()
		var diff = deg-this.rotationAbs;
		if (Math.abs(diff) < 90){ // normal case
			// nothing
		} else { // case like 3, 177 (both close to vertical)
			// this rotation is > than target, e.g. 177 to 3, rotate positively
			if (rotationAbs > deg){
				diff = deg + (180 - rotationAbs);
			} else { // this rotation < than target, e.g. 3 to 177, rotate negatively
				diff = -1*(rotationAbs + (180 - deg));	
			}
		}
		var d;	
		if (Math.abs(diff) > this.PARALLEL_DISCRIM_THRESH){
			d = percent*diff;
			if (d!=0) this.rotateDegrees(d, point);
			return true;
		} else {
			d = diff;
			if (d!=0) this.rotateDegrees(d, point);
			return false;
		}			
	}
		
	p.rotateToRadians = function(ang, percent, point){
		percent = percent != null ? percent : 1;
		var d = percent*((ang+Math.PI)%Math.PI-angleAbs);
		if (Math.abs(d) > this.PARALLEL_DISCRIM_THRESH/180*Math.PI){
			this.rotateDegrees(d, point);
			return false;
		} else {
			return true;
		}			
	}
	
	/** rotate about the point */
	p.rotateDegrees = function(deg, point){
		if (point == null) point = this.midpoint();
		this.rotateRadians(deg*Math.PI/180, point);
	}
	
	/** rotate about the point */
	p.rotateRadians = function(rad, point){
		if (point == null) point = this.midpoint();
		// translate endpoints based on point so that we are rotating about zero
		var e1x = this.point1.x - point.x;
		var e1y = this.point1.y - point.y;
		var e2x = this.point2.x - point.x;
		var e2y = this.point2.y - point.y;
			
		var e1xn = e1x*Math.cos(rad) - e1y*Math.sin(rad);
		var e1yn = e1x*Math.sin(rad) + e1y*Math.cos(rad);
		var e2xn = e2x*Math.cos(rad) - e2y*Math.sin(rad);
		var e2yn = e2x*Math.sin(rad) + e2y*Math.cos(rad);
					
		if (this.point1.moveTo(e1xn + point.x, e1yn + point.y)){
			this.point1.redrawSegments();
			this.point1.redrawAngles();
		}
		if (this.point2.moveTo(e2xn + point.x, e2yn + point.y)){
			this.point2.redrawSegments();
			this.point2.redrawAngles();
		}		
	}	
	
	/** Adds a new partner to this segments list of congruent partners.  If already exists return false, else return true; 
	 * Also, updates the count to reflect the minimum of all partners.
	 * */
	p.addCongruentPartner = function(ds, count){
		count = count != null ? count : 0;
		if (count==0) count = congruentCount;
		var found= false;
		for (var _ds in this.congruentPartners){
			if (_ds == ds){
				found = true;
			}
		}
		if (!found){
			this.congruentPartners.push(ds);
			// do converse
			ds.addCongruentPartner(this, count);
		}
		return this.setMinimumCongruentCount(count);	
	}
	/** Removes the Draw Segment from this objects collection, does not do converse */
	p.removeCongruentPartner = function(ds){
		var i= this.congruentPartners.indexOf(ds);
		if (i >= 0){
			this.congruentPartners.splice(i,1);
			return true;			
		}
		return false;
	}
	/** Go through all partners and make sure that all congruent counts are the same, and minimized */
	p.setMinimumCongruentCount = function(count){
		count = count != null ? count : 0;
		if (this.congruentPartners.length > 0){
			var minCount;
			if (count == 0)
			{
				minCount = this.congruentCount;
			} else if(this.congruentCount == 0)
			{
				minCount = count;
			} else 
			{	
				minCount = Math.min(count, this.congruentCount);
			}
			//trace("count", count,"congruentCount",  congruentCount, "minCount", minCount)
			for (var _ds in this.congruentPartners){
				//trace("count of segment", _ds.congruentCount);
				if (_ds.congruentCount < minCount && _ds.congruentCount > 0) minCount = _ds.congruentCount;
			}
			this.congruentCount = minCount;
			for (_ds in this.congruentPartners){ _ds.congruentCount = minCount; }
			//trace("Minimum count of segment", minCount);
			return minCount;
		} else {
			this.congruentCount = 0;
			return 0;
		}
	}
	
	/** Adds a new partner to this segments list of parallel partners.  If already exists return false, else return true; 
	 * Also, updates the count to reflect the minimum of all partners.
	 * */
	p.addParallelPartner = function(ds, count){
		count = count != null ? count : 0;
		if (count == 0) count = congruentCount;
		
		var found= false;
		for (var _ds in this.parallelPartners){
			if (_ds == ds){
				found = true;
			}
		}
		if (!found){
			this.parallelPartners.push(ds);
			// do converse
			ds.addParallelPartner(this, count);
		}
		return this.setMinimumParallelCount(count);			
	}
	/** Removes the Draw Segment from this objects collection, does not do converse */
	p.removeParallelPartner = function(ds){
		var i = this.parallelPartners.indexOf(ds);
		if (i >= 0){
			this.parallelPartners.splice(i,1);
			return true;			
		}
		return false;
	}
	/** Go through all partners and make sure that all congruent counts are the same, and minimized 
	 * the excluding parameter is used when we are breaking up a partner, to ensure that ex-partners don't have the same count
	 * */
	p.setMinimumParallelCount = function(count, excluding){
		count = count != null ? count : 0;
		excluding = excluding != null ? excluding : 0;
		if (this.parallelPartners.length > 0){
			var minCount;
			if (count == 0){
				minCount = this.parallelCount;
			} else if(this.parallelCount == 0){
				minCount = count;
			} else {	
				minCount = Math.min(count, this.parallelCount);
			}
			for (var _ds in this.parallelPartners){
				if (_ds.parallelCount < minCount && _ds.parallelCount > 0) minCount = _ds.parallelCount;
			}
			this.parallelCount = minCount;
			for (_ds in this.parallelPartners){ _ds.parallelCount = minCount; }
			
			return minCount;
		} else {
			this.parallelCount = 0;
			return 0;
		}
	}
			
	/** Looks for all congruencies with this segment and checks if they are still valid, use threshold to determine congruency.
	 * Returns true if a change has been made */
	p.checkExistingCongruencies = function(threshold){
		var changed = false;
		for (var _ds in this.congruentPartners){
			if (Math.abs(this.length() - _ds.length) > threshold){
				this.removeCongruentPartner(_ds);
				_ds.removeCongruentPartner(this);
				changed = true;
			}
		}
		return changed;
	}
	/** Looks for all congruencies with this segment and checks if they are still valid, use threshold to determine congruency */
	p.checkExistingParallels = function(threshold){
		var changed = false;
		for (var _ds in this.parallelPartners){
			//trace (this.rotationAbs, _ds.rotationAbs, MathUtilities.calcAcuteRotationAbs(this.rotationAbs, _ds.rotationAbs)); 
			if (MathUtilities.calcAcuteRotationAbs(this.rotationAbs(), _ds.rotationAbs()) > threshold){
				this.removeParallelPartner(_ds);
				_ds.removeParallelPartner(this);
				changed = true;
			}
		}
		return changed;
	}
	
	
	/** Applies congruency markings, one marking for each count. If zero, remove. */
	p.setCongruentCount = function(count){
		var congruentCount = this.congruentCount = count;
		var congruentMarking = this.congruentMarking;
		if (congruentCount == 0){
			if (this.congruentMarking != null)
			{
				this.removeChild(congruentMarking);
				congruentMarking = null;
			}
		} else { //greater than zero
			if (this.congruentMarking == null){
				congruentMarking = new Shape();
				this.addChild(congruentMarking);
			} else {
				congruentMarking.graphics.clear();
			}
			congruentMarking.graphics.setStrokeStyle(2).beginStroke("0000FF");
			// put this marking 2/3rds up the segment on right
			var i;
			if (this.angle() >= 0) {
				for (i=0; i < congruentCount; i++){
					congruentMarking.graphics.moveTo(-this.BACK_HEIGHT/2, -this.length()*2/3+i*this.BACK_HEIGHT/2);
					congruentMarking.graphics.lineTo(this.BACK_HEIGHT/2, -this.length()*2/3+i*this.BACK_HEIGHT/2);
				}
				congruentMarking.x = endpoint1.x;
				congruentMarking.y = endpoint1.y;
			} else {
				for (i=0; i < congruentCount; i++) {
					congruentMarking.graphics.moveTo(-this.BACK_HEIGHT/2, -this.length()*2/3+i*this.BACK_HEIGHT/2);
					congruentMarking.graphics.lineTo(this.BACK_HEIGHT/2, -this.length()*2/3+i*this.BACK_HEIGHT/2);
				}
				congruentMarking.x = endpoint2.x;
				congruentMarking.y = endpoint2.y;
			}
			congruentMarking.rotation = rotationAbs;
		}
	}
	
	/** Applies parallel markings, one marking for each count. If zero, remove. */
	p.setParallelCount = function(count){
		var parallelCount = this.parallelCount = count;
		var parallelMarking = this.parallelMarking;
		if (parallelCount == 0)
		{
			if (this.parallelMarking != null)
			{
				this.removeChild(parallelMarking);
				parallelMarking = null;
			}
		} else //greater than zero
		{
			if (this.parallelMarking == null)
			{
				parallelMarking = new Shape();
				this.addChild(parallelMarking)
			} else
			{
				parallelMarking.graphics.clear();
			}
			parallelMarking.graphics.setStrokeStyle(2).beginStroke("0000FF");
			// put this marking 2/3rds up the segment on right
			var i;
			if (this.angle >= 0){
				for (i=0; i < parallelCount; i++){
					parallelMarking.graphics.moveTo(-this.BACK_HEIGHT/2, -this.length()*1/3+i*this.BACK_HEIGHT/2);
					parallelMarking.graphics.lineTo(0, -this.length()*1/3+(i-1)*this.BACK_HEIGHT/2);
					parallelMarking.graphics.lineTo(this.BACK_HEIGHT/2, -this.length()*1/3+i*this.BACK_HEIGHT/2);
				}
				parallelMarking.x = endpoint1.x;
				parallelMarking.y = endpoint1.y;
			} else {
				for (i=0; i < parallelCount; i++){
					parallelMarking.graphics.moveTo(-this.BACK_HEIGHT/2, -this.length()*1/3+i*this.BACK_HEIGHT/2);
					parallelMarking.graphics.lineTo(0, -this.length()*1/3+(i-1)*this.BACK_HEIGHT/2);
					parallelMarking.graphics.lineTo(this.BACK_HEIGHT/2, -this.length()*1/3+i*this.BACK_HEIGHT/2);
				}
				parallelMarking.x = endpoint2.x;
				parallelMarking.y = endpoint2.y;
			}
			parallelMarking.rotation = rotationAbs;
		}
	}

	/** This function is used the panel class to redraw from point to point */
	p.redraw = function(dp){
		this.ready_to_update = true;
		// we won't bother if the given drawpoint is not included
		if (dp == null || this.containsDrawPoint(dp)){
			this.backShape.graphics.clear();
			this.frontShape.graphics.clear();
			this.backShape.graphics.beginFill("rgba(200,200,200,0)");
			this.backShape.graphics.drawRect(-this.BACK_HEIGHT/2, -this.length(), this.BACK_HEIGHT, this.length());
			this.backShape.graphics.endFill();
			this.backShape.x = this.point1.x;
			this.backShape.y = this.point1.y;
			this.backShape.rotation = this.rotation();
			if (this.outlined){
				this.frontShape.graphics.setStrokeStyle(this.segmentsize).beginStroke(this.OUTLINE_COLOR);
			} else if (this.enhanced){
				this.frontShape.graphics.setStrokeStyle(this.segmentsize).beginStroke(this.ENHANCE_COLOR);
			} else if (this.fixed){
				this.frontShape.graphics.setStrokeStyle(this.segmentsize).beginStroke(this.FIXED_COLOR);
			} else {
				this.frontShape.graphics.setStrokeStyle(this.segmentsize).beginStroke(this.SEGMENT_COLOR[0]);
			}
			this.frontShape.graphics.mt(0,0).lt(0, -this.length());	
			this.frontShape.x = this.point1.x;
			this.frontShape.y = this.point1.y;
			this.frontShape.rotation = this.rotation();			
			
			this.setCongruentCount(this.congruentCount);
			this.setParallelCount(this.parallelCount);
				
			// if pinned, draw pins along length of segment
			if (this.pinned){
				var pcount = Math.floor(this.length()/(8*this.SEGMENT_SIZE/2));
				this.frontShape.graphics.setStrokeStyle(0);
				for (var i=0; i < pcount; i++){
					this.frontShape.graphics.beginFill("#FFFFFF");
					this.frontShape.graphics.drawCircle(0, -this.length()*i/pcount, this.SEGMENT_SIZE/2);
					this.frontShape.graphics.endFill();
				}				
			}						
		}
	}

	p._tick = function(){
		this.Container_tick();
	}
	
	window.DrawSegment = DrawSegment;
}(window));
