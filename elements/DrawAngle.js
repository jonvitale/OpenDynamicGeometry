(function (window)
{
	/** This class creates an object that is related to but separate from DrawSegment and DrawPoint in that it contains links to
	 * three points and two segments.  Optionally, we can draw an arc to indicate the position of this internal angle */
	function DrawAngle (segment1, segment2, point1, point2, pointC){
		this.initialize(segment1, segment2, point1, point2, pointC);
	}
	var p = DrawAngle.prototype = new createjs.Container();
	p.Container_initialize = DrawAngle.prototype.initialize;
	p.Container_tick = p._tick;
		
	// CONSTANTS
	p.DEGREE_DISCRIM_THRESH = 0.1; // The minimum difference (in degrees) that we adjust a line to match the slope of another line
	p.DIAMETER = 40;
			
	// CONSTRUCTOR
	/** Can be constructed with either segments (2) or points (3).  Order of points is important */ 
	p.initialize = function (segment1, segment2, point1, point2, pointC){
		this.Container_initialize();
		
		/** private objects */
		this.point1 = null,this.point2 = null, this.pointC = null; //needs all three
		this.segment1 = null, this.segment2 = null; // needs both
		this.congruentPartners = [];
		this.congruentMarking = null;
		/** private vars */
		this.radius=0;
		this.congruentCount = 0; // how many markings
		this.right = false; // been validated right?
		
		var s1, s2;
		var p;
		var componentsFound = false;
		this.mouseEnabled = false;
		if (segment1 != null && segment2 != null){
			// make sure these segments have a point in common
			if (segment1.point1 == segment2.point1 || segment1.point1 == segment2.point2 || segment1.point2 == segment2.point1 || segment1.point2 == segment2.point2){
				componentsFound = true;
				this.segment1 = segment1;
				this.segment2 = segment2;
				if (segment1.point1 == segment2.point1){
					this.pointC = segment1.point1;
					this.point1 = segment1.point2;
					this.point2 = segment2.point2;
				} else if (segment1.point1 == segment2.point2){
					this.pointC = segment1.point1;
					this.point1 = segment1.point2;
					this.point2 = segment2.point1;
				} else if (segment1.point2 == segment2.point1){
					this.pointC = segment1.point2;
					this.point1 = segment1.point1;
					this.point2 = segment2.point2;
				} else if (segment1.point2 == segment2.point2){
					this.pointC = segment1.point2;
					this.point1 = segment1.point1;
					this.point2 = segment2.point1;
				} else {
					console.log("huh, in DrawAngle constructor this shouldn't happen");
				}
			} else {
				console.log("in new angle, problem matching points", segment1.endpoint1, segment1.endpoint2, segment2.endpoint1, segment2.endpoint2, segment1.endpoint2==segment2.endpoint2, segment1.point2==segment2.point2);
			}
		} else if (point1 != null && point2 != null && pointC != null){
			var segments = pointC.drawSegments;
			for (var i=0; i < segments.length-1; i++) {	
				s1 = segments[i];
				// does the current segment contain both pointC and either point1 or point2
				if ( (s1.point1 == point1 && s1.point2 == pointC) || (s1.point1 == point1 && s1.point2 == pointC) || (s1.point1 == point2 && s1.point2 == pointC) || (s1.point1 == point2 && s1.point2 == pointC)){
					// look through the rest of the array for the other segment
					for (var j=i+1; j < segments.length; j++){
						// Check to make sure everything adds up
						if ( (s1.point1 == point1 && s1.point2 == pointC && s2.point1 == point2 && s2.point2 == pointC) || (s1.point1 == point1 && s1.point2 == pointC && s2.point1 == point2 && s2.point2 == pointC) || (s1.point1 == point2 && s1.point2 == pointC && s2.point1 == point1 && s2.point2 == pointC) || (s1.point1 == point2 && s1.point2 == pointC && s2.point1 == point1 && s2.point2 == pointC) || (s1.point1 == point1 && s1.point2 == pointC && s2.point1 == pointC && s2.point2 == point2) || (s1.point1 == point1 && s1.point2 == pointC && s2.point1 == pointC && s2.point2 == point2) || (s1.point1 == point2 && s1.point2 == pointC && s2.point1 == pointC && s2.point2 == point1) || (s1.point1 == point2 && s1.point2 == pointC && s2.point1 == pointC && s2.point2 == point1)){
							componentsFound = true;
							this.point1 = point1;
							this.point2 = point2;
							this.pointC = pointC;
							if (s1.point1 == point1 || s1.point2 == point1)	{
								this.segment1 = s1;
								this.segment2 = s2;
							} else {
								this.segment2 = s1;
								this.segment1 = s2;
							}
						}
					}
				}
			}
		}
		
		this.background = new createjs.Shape();
		var g = this.background.graphics;
		this.addChild(this.background);
		
		// Did we find the right components?
		if (componentsFound)
		{
			g.beginFill("rgba(255,255,255,0)").drawEllipse(-DIAMETER/2,-DIAMETER/2,DIAMETER,DIAMETER).endFill();
			// add references in points
			this.point1.addAngle(this);
			this.point2.addAngle(this);
			this.pointC.addAngle(this);
			
			//center this at pointC
			this.x = this.pointC.x;
			this.y = this.pointC.y;
			
			this.dispatchEvent(new Event(Event.COMPLETE));
		} else
		{
			console.log("Incorrect components for angle");
			this.dispatchEvent(new Event(Event.CANCEL));
		}
	}
	
	p.bisectorAngle = function (){return MathUtilities.calcAngleBisector(this.segment1.angleFrom(this.pointC), this.segment2.angleFrom(this.pointC));}
	p.bisectorRotation = function (){return MathUtilities.radToDeg(MathUtilities.calcAngleBisector(this.segment1.angleFrom(this.pointC), this.segment2.angleFrom(this.pointC)));}
	
	p.degrees = function () {return MathUtilities.calcAcuteRotationBetween(this.point1.point(), this.point2.point(), this.pointC.point());}
	p.radians = function () {return MathUtilities.calcAcuteAngleBetween(this.point1.point(), this.point2.point(), this.pointC.point());}
	
	p.containsDrawPoint = function(drawpoint){
		if (drawpoint == this.point1 || drawpoint == this.point2 || drawpoint == this.pointC){
			return true;
		} else {
			return false;
		}
	}
	p.containsPoint = function(point){
		if (point.x == this.point1.x && point.y == this.point1.y || point.x == this.point2.x && point.y == this.point2.y || point.x == pointC.x && point.y == pointC.y){
			return true;
		} else {
			return false;
		}
	}
	p.containsDrawSegment = function(drawsegment){
		if (this.segment1 == drawsegment || this.segment2 == drawsegment){
			return true;
		} else {
			return false;
		}
	}
	
	p.adjustToDegrees = function(deg, percent, tangle){
		percent = percent != null ? percent : 1;
		
		if (Math.abs(deg-this.degrees()) > this.DEGREE_DISCRIM_THRESH)	{
			var d = percent*(deg-this.degrees());
			if (d!=0) this.adjustDegrees(d, tangle);
			return true;
		}else {
			return false;
		}		
	}
	p.adjustToRadians = function(ang, percent,  tangle){
		percent = percent != null ? percent : 1;
		var d;
		//console.log(MathUtilities.radToDeg(ang),MathUtilities.radToDeg(this.radians()), MathUtilities.radToDeg(Math.abs(ang-this.radians)), MathUtilities.radToDeg(DEGREE_DISCRIM_THRESH/180*Math.PI));
		if (Math.abs(ang-this.radians()) > this.DEGREE_DISCRIM_THRESH/180*Math.PI)	{
			d = percent*(ang-this.radians());
			if (d!=0) this.adjustRadians(d, tangle);
			return true;
		}else 
		{
			d = (ang-this.radians());
			if (d!=0) this.adjustRadians(d, tangle);
			return false;
		}		
	}
	/**** Adjusting points and segments */
	p.adjustDegrees  = function(deg,  tangle){
		this.adjustRadians(MathUtilities.degToRad(deg), tangle);
	}
	/**** Adjusting points and segments */
	p.adjustRadians  = function(rad, tangle){
		if (tangle != null){
			//// For each of the endpoints of this angle we want to figure out on which segment we will dilate, or not
			
			////////////////////  endpoint 1 ////////////////////////////
			//// There are thee main possibilities in the relationship between this angle and the target angle (tangle)
			// 1) These angles are adjacent, we don't want to effect the segment coming out of the target angle, just the segment on the other side
			// 2) These are separated by two segments (opposite in quad), we want to adjust both sides of the target angle without changing the angle itself
			// 3) These angles have more than two degrees of separation, so doesn't matter how we adjust this angle
				//1) Isthis.point1 and the target point adjacent, if so we will not be adjusting a segment on this side
			var adjangle1;
			var adjsegment1;
			if (this.point1 == tangle.pointC){
				adjangle1 = null;
				adjsegment1 = null;
			}  //2) Are these angles separated by two degrees? If so we will make sure to adjust the correct segment
			else if (this.point1 == tangle.point1 || this.point1 == tangle.point2)	{
				if (this.point1 == tangle.point1){
					adjsegment1 = tangle.segment1;
					adjangle1 = this.angleAtEndPoint(adjsegment1);
				} else if (this.point1 == tangle.point2){
					adjsegment1 = tangle.segment2;
					adjangle1 = this.angleAtEndPoint(adjsegment1);
				} else{
					console.log("In DrawAngle, shouldn't happen");
				}
			}  //3) Are these angles separated by more than two degres, then the segment we dilate does not matter (but we'll pick a useful one) 
			else {
				// get a segment at point1
				adjangle1 = this.point1.getRightestAngle(this.segment1);
				//adjsegment1 = adjangle1.otherDrawSegment(segment1);
				adjsegment1 = null;
			}
			
			////////////////////  endpoint 2 ////////////////////////////
			//// There are thee main possibilities in the relationship between this angle and the target angle (tangle)
			// 1) These angles are adjacent, we don't want to effect the segment coming out of the target angle, just the segment on the other side
			// 2) These are separated by two segments (opposite in quad), we want to adjust both sides of the target angle without changing the angle itself
			// 3) These angles have more than two degrees of separation, so doesn't matter how we adjust this angle
			//1) Is point1 and the target point adjacent, if so we will not be adjusting a segment on this side
			var adjangle2;
			var adjsegment2;
			if (this.point2 == tangle.pointC){
				adjangle2 = null;
				adjsegment2 = null;
			}  //2) Are these angles separated by two degrees? If so we will make sure to adjust the correct segment
			else if (this.point2 == tangle.point1 || this.point2 == tangle.point2){
				if (this.point2 == tangle.point1){
					adjsegment2 = tangle.segment1;
					adjangle2 = this.angleAtEndPoint(adjsegment2);
				} else if (this.point2 == tangle.point2){
					adjsegment2 = tangle.segment2;
					adjangle2 = this.angleAtEndPoint(adjsegment2);
				} else{
					console.log("In DrawAngle, shouldn't happen");
				}
			}  //3) Are these angles separated by more than two degres, then the segment we dilate does not matter (but we'll pick a useful one) 
			else{
				// get a segment at point2
				adjangle2 = this.point2.getRightestAngle(this.segment2);
				//adjsegment2 = adjangle2.otherDrawSegment(segment2);
				adjsegment2 = null;
			}
			
			// now that we know which segments we are adjusting allocate an amount to each
			var rad1, rad2;
			if (adjangle1 != null && adjangle2 != null)
			{
				rad1 = rad/2; rad2 = rad/2;	
			} else if (adjangle1 != null)
			{
				rad1 = rad; rad2 = 0;
			} else if (adjangle2 != null)
			{
				rad2 = rad; rad1 = 0;
			} else 
			{
				return;
			}
		
			/// Adjust segment 1 according to the given angles
			/// A triangle is formed between this (center) point, the adjacent point that is shifting, and that point's eventual position
			/// we can get two angles and a side and use Law of Sines
			/// Get angle at current adjacent Point
			if (rad1 != 0 && adjsegment1 != null){
				var C1 = adjangle1.radians();				
				/// if our change is positive, need to find supplement of angle because triangle is "external"
				if (rad1 > 0) C1 = Math.PI - C1;
				/// Complete the triangle
				var B1 = Math.PI - C1 - Math.abs(rad1);
				/// Law of Sines
				var dx1 = MathUtilities.lawOfSines(this.segment1.length, B1, 0, Math.abs(rad1));
				if (rad1 < 0) dx1 = -dx1;
				//console.log("segment1: adjusting angle", rad1, adjangle1.degrees, "adjusting side", adjsegment1.length, "amount", dx1);
				adjsegment1.dilate(dx1, this.point1);
			}
			/// Adjust segment 2 according to the given angles
			/// A triangle is formed between this (center) point, the adjacent point that is shifting, and that point's eventual position
			/// we can get two angles and a side and use Law of Sines
			/// Get angle at current adjacent Point
			if (rad2 != 0 && adjsegment2 != null)
				{var C2 = adjangle1.radians();				
				/// if our change is positive, need to find supplement of angle because triangle is "external"
				if (rad2 > 0) C2 = Math.PI - C2;
				/// Complete the triangle
				var B2 = Math.PI - C2 - Math.abs(rad2);
				/// Law of Sines
				var dx2 = MathUtilities.lawOfSines(this.segment2.length, B2, 0, Math.abs(rad2));
				if (rad2 < 0) dx2 = -dx2;
				//console.log("segment2: adjusting angle", rad2, adjangle2.degrees, "adjusting side", adjsegment2.length, "amount", dx2);
				adjsegment2.dilate(dx2, this.point2);
			}
			
			/// We are just rotating the segment because it doesn't need to be constrained to a specific line
			if (rad1 != 0 && adjsegment1 == null)
			{
				var dir1 = MathUtilities.calcAcuteDirectionBetween(this.point1.point, this.point2.point, this.pointC.point);
				if(dir1 != 0) this.segment1.rotateRadians(dir1*rad1,this.pointC.point);
			}
			if (rad2 != 0 && adjsegment2 == null)
			{
				var dir2 = MathUtilities.calcAcuteDirectionBetween(this.point2.point, this.point1.point, this.pointC.point);
				if (dir2 != 0) this.segment2.rotateRadians(dir2*rad2,this.pointC.point);
			}
			
		} // 4) We are not trying to match a target angle, just rotate these segments without regards to other angles			 
		else{
			// we need direction in order to adjust correctly
			//console.log("acute direction", MathUtilities.calcAcuteDirectionBetween(this.point1.point, this.point2.point, this.pointC.point));
			var dir = MathUtilities.calcAcuteDirectionBetween(this.point1.point, this.point2.point, this.pointC.point);
			if (dir != 0) {
				this.segment1.rotateRadians(dir*rad/2,this.pointC.point);
				this.segment2.rotateRadians(dir*-rad/2,this.pointC.point);
			}
		}
		
		point1.redrawSegments();
		point2.redrawSegments();
		point1.redrawAngles();
		point2.redrawAngles();
		pointC.redrawAngles();
	}
	
	///////*** Get stuff /////////////////////
	/** Get the other segment at this angle */
	p.otherDrawSegment = function(s){
		if (s == this.segment1)	{
			return this.segment2;
		} else if (s == this.segment2){
			return this.segment1;
		} else {
			return null;
		}
	}
	/** Looks for this segment at each of the points (including center) and returns angle that is included, can be this one*/
	p.angleAtEndPoint = function(s){
		if (s == this.segment1){
			return this;
		} else if (s == this.segment2){
			return this;
		} else {
			var a
			// go through end point to see if the segment is attached
			for (a in this.point1.drawAngles){
				// found segment in the next angle?
				if (a.segment1 == s && (a.segment2 == this.segment1 || a.segment2 == this.segment1) || a.segment2 == s && (a.segment1 == this.segment1 || a.segment1 == this.segment2)){
					// return angle 	
					return a;
				}
			}
			for (a in this.point2.drawAngles){
				// found segment in the next angle?
				if (a.segment1 == s && (a.segment2 == this.segment1 || a.segment2 == this.segment1) || a.segment2 == s && (a.segment1 == this.segment1 || a.segment1 == this.segment2)){
					// return angle 	
					return a;
				}
			}
			return null;
		}
	}
	
	/** Adds a new partner to this segments list of congruent partners.  If already exists return false, else return true; 
	 * Also, updates the count to reflect the minimum of all partners.
	 * */
	p.addCongruentPartner = function(da, count){
		if (count == 0) count = congruentCount;
		
		var found = false;
		for (var _da in this.congruentPartners)
		{
			if (_da == da) 
			{
				found = true;
			}
		}
		if (!found)
		{
			congruentPartners.push(da);
			// do converse
			da.addCongruentPartner(this, count);
		}
		return setMinimumCongruentCount(count);
	}
	/** Removes the Draw Segment from this objects collection, does not do converse */
	p.removeCongruentPartner = function(da)
	{
		var i = this.congruentPartners.indexOf(da);
		if (i >= 0) {
			this.congruentPartners.splice(i,1);
			return true;			
		}
		return false;
	}
	/** Go through all partners and make sure that all congruent counts are the same, and minimized */
	p.setMinimumCongruentCount  = function(count){
		count = count != null ? count : 0;
		if (this.congruentPartners.length > 0){
			var minCount;
			if (count == 0) {
				minCount = this.congruentCount;
			} else if(congruentCount == 0) {
				minCount = count;
			} else {	
				minCount = Math.min(count, this.congruentCount);
			}
			for (var _da in this.congruentPartners){
				if (_da.congruentCount < minCount && _da.congruentCount > 0) minCount = _da.congruentCount;
				if (_da.right) this.right;
			}
			this.setCongruentCount(minCount);
			for (_da in this.congruentPartners){ _da.setCongruentCount(minCount); _da.setRight(this.right);}
			
			return minCount;
		} else {
			this.setCongruentCount(0);
			return 0;
		}
	}
	/** Applies congruency markings, one marking for count. If zero, remove. */
	p.setCongruentCount = function(count){
		this.congruentCount = count;
		if (this.right){
			this.setRight(right);
		}
		else if (this.congruentCount == 0){
			if (this.congruentMarking != null){
				this.removeChild(this.congruentMarking);
				this.congruentMarking = null;
			}
		} else //greater than zero
		{
			if (this.congruentMarking == null){
				this.congruentMarking = new createjs.Shape();
				this.addChild(this.congruentMarking);
			} else {
				this.congruentMarking.graphics.clear();
			}
			this.congruentMarking.graphics.beginFill("rgba(100,100,100,0)").drawEllipse(-this.DIAMETER/2,-this.DIAMETER/2,this.DIAMETER,this.DIAMETER).endFill();
			
			for (var i=0; i < this.congruentCount; i++){
				MathUtilities.drawArc(this.congruentMarking.graphics,2, 0x0000FF, 0, 0, this.segment2.angleFrom(pointC), this.segment1.angleFrom(pointC), (i+1)/2*this.DIAMETER);
			}			
		}
	}
	/** Looks for all congruencies with this segment and checks if they are still valid, use threshold to determine congruency.
	 * Returns true if a change has been made */
	p.checkExistingCongruencies = function(threshold)
	{
		var changed = false;
		for (var _da in this.congruentPartners)
		{
			if (Math.abs(this.degrees()- _da.degrees) > threshold)
			{
				this.removeCongruentPartner(_da);
				_da.removeCongruentPartner(this);
				changed = true;
			}
		}
		return changed;
	}
	/** Set the angle marking to a square if true, else look up congruency markings */
	p.setRight = function(b){
		this.right = b;
		if (this.right) {
			if (this.congruentMarking == null){
				this.congruentMarking = new Shape();
				this.addChild(this.congruentMarking);
			} else{
				this.congruentMarking.graphics.clear();
			}
			this.congruentMarking.graphics.beginFill("rgba(100,100,100,0)").drawEllipse(-this.DIAMETER/2,-this.DIAMETER/2,this.DIAMETER,this.DIAMETER).endFill();
			
			this.congruentMarking.graphics.setStrokeStyle(2).beginStroke("#0000FF").moveTo(this.DIAMETER/2*Math.sin(this.segment2.angleFrom(this.pointC)),-this.DIAMETER/2*Math.cos(this.segment2.angleFrom(pointC))).lineTo(DIAMETER/2*Math.SQRT2*Math.sin(this.bisectorAngle()),-this.DIAMETER/2*Math.SQRT2*Math.cos(this.bisectorAngle())).lineTo(this.DIAMETER/2*Math.sin(this.segment1.angleFrom(this.pointC)),-this.DIAMETER/2*Math.cos(this.segment1.angleFrom(pointC)));	
		} else {
			this.setCongruentCount(this.congruentCount);
		}
	}	
	/** Looks for all congruencies with this segment and checks if they are still valid, use threshold to determine congruency.
	 * Returns true if a change has been made */
	p.checkExistingRight = function(threshold){
		if (this.right){			
			if (Math.abs(this.degrees() - 90) > threshold) { this.setRight(false); return true; }
			else { return false;}
		} else {
			return false;
		}
	}
	
	/** This function is used the panel class to redraw from point to point */
	p.redraw = function(dp){
		this.ready_to_update = true;
		// we won't bother if the given drawpoint is not included
		if (dp == null || this.containsDrawPoint(dp)){					
			this.x = this.pointC.x;
			this.y = this.pointC.y;
			//this.setCongruentCount(congruentCount);
		}		
	}

	p._tick = function(){
		this.Container_tick();
	}
	
	window.DrawAngle = DrawAngle;
}(window));

		
	