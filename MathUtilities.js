(function (window)
{
	var p = MathUtilities = {};
	
	p.distance = function(x1, y1, x2, y2){
		return (Math.sqrt(Math.pow(x1-x2,2) + Math.pow(y1-y2,2)));
	}
	
	/** a, b, and c (optional) are distances, C is an angle in radians, either c or C is left blank */
	p.lawOfCosines = function(a, b, c, C){
		/// in flash c and C defaulted to 0
		
		// Use law of cosines to retrieve angle (in radians)
		if (C != 0 && c == 0)
		{
			return Math.sqrt(a*a + b*b - 2*a*b * Math.cos(C));
		} else if (C == 0 && c != 0)
		{
			return  Math.acos((c*c - a*a - b*b)/(-2*a*b));
		}
	}
	p.invSlope = function(x1, y1, x2, y2){
		return this.invSlopePoint(new Point(x1,y1), new Point(x2, y2));
	}
	p.invSlopePoint = function(point1, point2){
		return (-1/((point2.y-point1.y)/(point2.x-point1.x)));
	}
	p.slope = function(x1, y1, x2, y2){
		return this.slopePoint(new Point(x1,y1), new Point(x2, y2));
	}
	p.slopePoint = function(point1, point2){
		return ((point2.y-point1.y)/(point2.x-point1.x));
	}
	p.intercept = function(x1, y1, x2, y2){
		var point1 = {x:x1, y:y1};
		var point2 = {x:x2, y:y2};
		var slope = this.slopePoint(point1, point2);
		return (this.interceptFromSlopePoint(point1, slope));
	}
	p.interceptFromSlope = function(x1, y1, slope){
		// y = mx + b   // b = y - mx
		var point1 = {x:x1, y:y1};
		return (point1.y - slope*point1.x);
	}
	
	p.interceptPoint = function(point1, point2){
		var slope = this.slopePoint(point1, point2);
		return (this.interceptFromSlopePoint(point1, slope));
	}
	
	p.interceptFromSlopePoint = function(point1, slope){
		// y = mx + b   // b = y - mx
		return (point1.y - slope*point1.x);
	}
	
	p.xinterceptFromSlope = function(x1, y1, slope){
		// y = mx + b // 0 = mx2 + b // -b = mx2 // x2 = -b/m
		var b = this.interceptFromSlope(x1, y1, slope);
		return (-b/slope);
	}
		
	p.intersection = function(slope1, intercept1, slope2, intercept2){
		// y = m1x+b1
		// y = m2x+b2
		// m1x+b1 = m2x+b2
		// x(m1-m2) = (b2-b1) =>  x = (b2-b1)/(m1-m2)
		var x = (intercept2-intercept1)/(slope1-slope2);
		// y = m1x+b1
		var y = slope1*x + intercept1;
		return {x:x, y:y};
	}
		
	/** with points (1 and 2) on L1 and points (1,2) on L2, find intersection */ 		
	p.intersectionPoints = function(point1L1, point2L1, point1L2, point2L2){
		var s1 = this.slopePoint(point1L1, point2L1);
		var s2 = this.slopePoint(point1L2, point2L2);
		var i1 = this.interceptPoint(point1L1, point2L1);
		var i2 = this.interceptPoint(point1L2, point2L2);
		return(this.intersection(s1, i1, s2, i2));
	}
	
	/** with pointPerp perpendicular to line from point1 to point2, find intersection */
	p.intersectionPerpPoints = function(pointPerp, point1, point2){ 
		var s1 = this.slopePoint(point1, point2);
		var i1 = this.interceptPoint(point1, point2);
		// inverse slope
		var s2 = -1/s1;
		var i2 = this.interceptFromSlope(pointPerp.x, pointPerp.y, s2);
		return(this.intersection(s1, i1, s2, i2));
	}
	
	p.midpoint = function(x1, y1, x2, y2){
		return this.midpointPoint({x:x1, y:y1}, {x:x2, y:y2});
	}
	
	p.midpointPoint = function(point1, point2){
		return {x:(point1.x+point2.x)/2, y:(point1.y+point2.y)/2};
	}
	
	/** Return two points along the same line as (x1,y1); (x2,y2), but out of the bounds given.  
	    This is used to construct a line that stretches across a whole screen */
	p.getPointsOutOfBoundsOnLine = function(x1, y1, x2, y2, WIDTH, HEIGHT){
		// Calculate angle between points
		var angle = this.calcAngleXY(x1,y1,x2,y2);
		var minDistance = Math.sqrt(WIDTH*WIDTH+HEIGHT*HEIGHT);
		// calculate from the first point
		var point1 = {x:x1+minDistance*Math.sin(angle),y:y1-minDistance*Math.cos(angle)};
		var point2 = {x:x1-minDistance*Math.sin(angle),Y:y1+minDistance*Math.cos(angle)};
		return [point1, point2];
	}

	p.getPointsOutOfBoundsOnLineRot = function(x1, y1, rot, WIDTH, HEIGHT){
		// get some arbitrary point on the same line
			
		var x2 = x1+100*Math.sin(this.degToRad(rot));
		var y2 = y1+100*-Math.cos(this.degToRad(rot));
					
		return this.getPointsOutOfBoundsOnLine(x1,y1,x2,y2, WIDTH, HEIGHT);		
	}
	
	/** Return two points along the same line as (x1,y1); (x2,y2), but out of the bounds given.  
	    This is used to construct a line that stretches across a whole screen */
	p.getPointsOutOfBoundsOnLinePerpendicular = function(x1, y1, x2, y2, WIDTH, HEIGHT){
		// Calculate angle between points
		var angle = this.calcAngleXY(x1,y1,x2,y2)+Math.PI/2;
		var minDistance = Math.sqrt(WIDTH*WIDTH+HEIGHT*HEIGHT);
		// calculate from the first point
		var point1 = {x:x2+minDistance*Math.sin(angle),y:y2-minDistance*Math.cos(angle)};
		var point2 = {x:x2-minDistance*Math.sin(angle),y:y2+minDistance*Math.cos(angle)};
		return [point1,point2];
	}
	
	p.calcPointFromZeroWithDegrees = function(deg, dist){
		return {x:Math.sin(this.degToRad(deg))*dist, y:Math.cos(this.degToRad(deg))*-dist};
	}
		
		
	/*  If the angle of p2 is greater than p1 1 is returned, if the angle of p1 is greater than p2 -1 is returned, if they are the same or 180
	 degrees then 0 is returned */
	p.calcAcuteDirectionBetween = function(p1, p2, centerP){
		var angle1 = this.calcAngle(p1,centerP);
		var angle2 = this.calcAngle(p2,centerP);
		return this.calcAcuteDirection(angle1,angle2);
	}
	
	p.calcAcuteDirection = function(angle1, angle2){
		var diff = angle1 - angle2;
		if (Math.abs(diff) > 0 && Math.abs(diff) < Math.PI){
			return diff/Math.abs(diff);
		} else if (Math.abs(diff) > Math.PI ){
			return -1*diff/Math.abs(diff);
		} else {
			return 0;
		}
	}
	
	p.calcAcuteDirectionDeg = function(deg1, deg2){
		return calcAcuteDirection(degToRad(deg1), degToRad(deg2));
	}
	
	p.calcAcuteRotationBetween = function(p1, p2, centerP){
		var rot1 = this.degToRad(this.calcRotation(p1,centerP));
		var rot2 = this.degToRad(this.calcRotation(p2,centerP));
		return this.radToDeg(calcAcuteAngle(rot1, rot2));			
	}
	
	/** This method finds the angle between the two points in the center.  Should use this function because
	it adjusts if the angle crosses the zero */
	p.calcAcuteAngleBetween = function(p1, p2, centerP){
		var rot1 = this.calcAngle(p1,centerP);
		var rot2 = this.calcAngle(p2,centerP);
		return this.calcAcuteAngle(rot1, rot2);			
	}
	
	p.calcAcuteRotation = function(rot1, rot2){
		if (Math.abs(rot1-rot2) <= 180){
			return Math.abs(rot1-rot2);
		} else {
			if (rot1 > rot2){
				rot2 += 360;
			} else {
				rot1 += 360;
			}			
			return Math.abs(rot1-rot2);
		}
	}
	
	p.calcAcuteAngle = function(angle1, angle2){
		if (Math.abs(angle1-angle2) <= Math.PI){
			return Math.abs(angle1-angle2);
		} else {
			if (angle1 > angle2){
				angle2 += Math.PI * 2;
			} else {
				angle1 += Math.PI * 2;
			}			
			return Math.abs(angle1-angle2);
		}
	}
	
	/*** not fully checked out */
	// calculate rotation at this goalpoint (segment) from the new angle
	// oRot, nAngle, nRot
	/// 0, 45, 135::: 0, 135, 45::: 45, 90, 135::: 45, 45, 180::: 45, 135, 90::: 135, 45,-90(270)::: 135, 135, 180::: 135, 90, -135(225),1
	/// 0, -45, -135::: 0, -135, -45::: 45, -45, -90::: 45, -135, 0::: 135, -135, 90::: 135,-90, 45
	/// -45, 45, 90::: -45, 135, 0::: -135, 45, 0::: -135, 135, -90
	/// -45, -45, -180::: -45, -135, -90::: 
	/// dir*((180 - nAngle) + oRot
				
	p.calcRotationFromAngle = function(angle, oldRotation, direction){
		return (direction * (180 - angle) + oldRotation) ;
	}
	
	p.calcAngleBisector = function(angle1, angle2){
		var bisector = (angle1 + angle2)/2;
		if (Math.abs(angle1 - angle2) > Math.PI){
			bisector = Math.PI + bisector;
		}
		return bisector;
	}
	
	/* Returns rotation in degrees*/
	p.calcRotation = function(distP, centerP){
		return this.radToDeg(this.calcAngle(distP,centerP));
	}
	
	/* Returns rotation in radians */
	p.calcAngle = function(distP, centerP){
		var distx = distP.x - centerP.x;
		var disty = distP.y - centerP.y;
		if (distP.x == centerP.x && distP.y == centerP.y){
			return 0;
		} else {	
			var rot = Math.atan(Math.abs(distx)/Math.abs(disty));
			if (distx < 0 && disty <= 0){ //Top Left
				rot =  -1* rot; 	
			} else if (distx > 0 && disty >= 0){ //Bottom Right
				rot = Math.PI - rot;
			} else if (distx <= 0 && disty > 0){ //Bottom Left
				rot = rot + -1*Math.PI;
			} else { // Top Right
			}
			return rot;
		}
	}
	
	/* Returns rotation in degrees */
	p.calcRotationXY = function(dx, dy, cx, cy){
		return this.radToDeg(this.calcAngleXY(dx,dy,cx,cy));
	}
		
	/* Returns rotation in radians */
	p.calcAngleXY = function(dx, dy, cx, cy){
		var distx = dx - cx;
		var disty = dy - cy;
			
		if (dx == cx && dy == cy){
			return 0;
		} else {	
			var rot = Math.atan(Math.abs(distx)/Math.abs(disty));
			if (distx < 0 && disty <= 0){ //Top Left
				rot = -1 * rot; 	
			} else if (distx > 0 && disty >= 0){ //Bottom Right
				rot = Math.PI - rot;
			} else if (distx <= 0 && disty > 0){ //Bottom Left
				rot = rot + -1*Math.PI;
			} else { // Top Right
			}
			return rot;
		}
	}
	
	/* Converts rotation (-180:180) to grade (-100:100) */
	p.degToGrade = function(deg){
		if (deg > 180){
			deg = -1*(360-deg);
		} else if (deg < -180){
			deg = (360+deg);
		}
		// negative degrees are no matter to grade, convert to positive
		if (deg < 0){
			deg += 180;
		}
		var grade = -1*(deg - 90)/90 * 100;
		if (grade == -100) grade = 100;
		return grade;
	}
	
	/* Converts grade to a positive rotation */
	p.gradeToPosDeg = function(grade){
		if (grade >= 0){
			return ( (1-grade/100)*90);
		} else {
			return ( (-grade/100)*90+90);
		}
	}
	
	/* converts rotation to slope */
	p.degToSlope = function(deg){
		if (deg == 0){ deg = .0001;} // slight deviation so what we don't get an error
		else if(deg == 180){ deg = 179.9999;}
		else if(deg == -180){ deg = -179.9999;}
		var grade = this.degToGrade(deg);
			
		return Math.tan(-grade/100*Math.PI/2); 
	}
	
	p.degToRad = function(deg){
		if (deg > 180){
			deg = -1*(360-deg);
		} else if (deg < -180){
			deg = (360+deg);
		}
		var rad = deg * Math.PI/180;
		return rad;
	}
	
	p.radToDeg = function(rad){
		var deg = rad * 180 / Math.PI;
		if (deg > 180){
			rad = -1*(360-deg);
		} else if (deg < -180){
			rad = (360+deg);
		}
		return deg;
	}
		
	/** 
		g: graphics object from a Shape class
		centerX  -- the center X coordinate of the circle the arc is located on
		centerY  -- the center Y coordinate of the circle the arc is located on
		startAngle  -- the starting angle to draw the arc from
		endAngle    -- the ending angle for the arc
		radius    -- the radius of the circle the arc is located on
		direction   -- toggle for going clockwise/counter-clockwise
	*/
	p.drawArc = function(g, color, centerX, centerY, startAngle, endAngle, radius, direction){
		var difference; 
		g.setStrokeStyle(4).beginStroke(color);
			
		if (endAngle > startAngle){
			difference = Math.abs(endAngle - startAngle);
			// How "far" around we actually have to draw 
		} else { //the user crosses over 360 degrees into the first quadrant
			difference = Math.abs( (endAngle + Math.PI*2) - startAngle); //go past one full rotation of the circle
		}
			
		var divisions = Math.floor(difference / (Math.PI / 4))+1;
		// The number of arcs we are going to use to simulate our simulated arc
			
		var span    = direction * difference / (2 * divisions);
		var controlRadius    = radius / Math.cos(span);
		//trace((startAngle*180/Math.PI) + " , " + (endAngle*180/Math.PI));
		//trace(Math.sin(startAngle)*radius+" , "+centerY + Math.cos(startAngle)*radius);
		g.moveTo(centerX + (Math.sin(startAngle)*radius), centerY - Math.cos(startAngle)*radius);
		var controlPoint;
		var anchorPoint;
		for(var i=0; i<divisions; ++i){
			endAngle    = startAngle + span;
			startAngle  = endAngle + span;
				
			controlPoint = {x:centerX+Math.sin(endAngle)*controlRadius, y:centerY-Math.cos(endAngle)*controlRadius};
			anchorPoint = {x:centerX+Math.sin(startAngle)*radius, y:centerY-Math.cos(startAngle)*radius};
			g.quadraticCurveTo(
				controlPoint.x,
				controlPoint.y,
				anchorPoint.x,
				anchorPoint.y
			);
		}
		return divisions;
	}
	
	window.MathUtilities = MathUtilities;
}(window));