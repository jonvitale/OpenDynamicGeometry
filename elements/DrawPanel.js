(function (window)
{
	/** Object allows user to draw on a canvas in either of two major modes: Free and Connected.
	Free mode: pen draws as user pressed and holds, fills up pixels underneath pen, eraser does same
	Connected mode: pen connects from a highlighted point, click off points to draw new point (if allowed)
	*/
	function DrawPanel (WIDTH, HEIGHT, json, connectedMode, allowDisconnectedPoints){
		this.initialize(WIDTH, HEIGHT, json, connectedMode, allowDisconnectedPoints);
	}
	var p = DrawPanel.prototype = new createjs.Container();
	p.Container_initialize = DrawPanel.prototype.initialize;
	p.Container_tick = p._tick;
	
	// CONSTANTS
	p.BACK_COLOR = "#E0FFD0";
	p.OUTLINE_COLOR = "#88FF88";
	p.PAINT_COLOR = "#000000";
		
	/** WIDTH and HEIGHT obvious, json provides information about existing points, connectedMode connects points, 
		allowDisconnectedPoints allows users to click a new point of main structure to create a second structure */
	p.initialize = function (WIDTH, HEIGHT, json, connectedMode, allowDisconnectedPoints){
		this.Container_initialize();
		this.WIDTH = WIDTH;
		this.HEIGHT = HEIGHT;
		this.json = json;
		this.disconnectedpoints = true;
		this.dragpoints = true;
		this.undoStack = [];
		this.redoStack = [];
		this.oobshapes = [];
		this.drawPoints = [];
		this.drawSegments = [];
		this.drawAngles = [];
		this.closedPolygons = [];
		this.childPolygons = [];
		this.cursor_tool = null;
		this.currentClosedPolygon = null;
		this.currentChildPolygon = null;
		this.currentChildShapeType = "";
		// private vars
		this.disconnectedpoints = [];
		this.dragpoints = [];
		this.outOfBounds = false;
		this.outOfPanel = false;
		this.pointCount = 0; 
		this.segmentCount = 0; 
		this.angleCount = 0; //a monotonically increasing count of points used to create a unique id
		this.pen_mode = false; 
		this.drag_mode = false;
		this.delete_mode = false;
		this.pin_mode = false;
		this.polygonSelection_mode = false;
		this.length_mode=false;
		this.angle_mode=false;
		this.right_mode=false;
		this.parallel_mode = false;
		this.modeName = "";
		this.currentDrawState = 0;
		this.congruentSegmentCount=0;
		this.congruentAngleCount=0;
		this.parallelCount=0;		
			
		if (json["parallel_threshold_degrees"] != null){this.parallel_threshold_degrees = json["parallel_threshold_degrees"];}
		else {this.parallel_threshold_degrees = 1;}
			
		if (json["length_threshold_pixels"] != null){this.length_threshold_pixels = json["length_threshold_pixels"];}
		else {this.length_threshold_pixels = 1;}
			
		if (json["angle_threshold_degrees"] != null){this.angle_threshold_degrees = json["angle_threshold_degrees"];}
		else {this.angle_threshold_degrees = 1;}
			
		if (json["right_threshold_degrees"] != null){this.right_threshold_degrees = json["right_threshold_degrees"];}
		else {this.right_threshold_degrees = 1;}
			
		if (json["tool_threshold_multiplier"] != null){this.tool_threshold_multiplier = json["tool_threshold_multiplier"];}
		else {this.tool_threshold_multiplier = 20;}			
			
		if (json["parallel_threshold_multiplier"] != null){this.parallel_threshold_multiplier = json["parallel_threshold_multiplier"];}
		else {this.parallel_threshold_multiplier = this.tool_threshold_multiplier;}			
			
		if (json["length_threshold_multiplier"] != null){this.length_threshold_multiplier = json["length_threshold_multiplier"];}
		else {this.length_threshold_multiplier = this.tool_threshold_multiplier;}			
			
		if (json["angle_threshold_multiplier"] != null){this.angle_threshold_multiplier = json["angle_threshold_multiplier"];}
		else {this.angle_threshold_multiplier = this.tool_threshold_multiplier;}			
			
		if (json["right_threshold_multiplier"] != null){this.right_threshold_multiplier = json["right_threshold_multiplier"];}
		else {this.right_threshold_multiplier = this.tool_threshold_multiplier;}			
			
		if (json["min_area"] != null){this.min_area = json["min_area"];} 
		else {this.min_area = 0;}
		if (this.min_area < 1) {this.min_area = this.min_area*this.WIDTH * this.HEIGHT}			
						
		this.MINIMUM_SEGMENT_LENGTH = odGeometry.unit*DrawPoint.prototype.POINT_SIZE;
		
		if (json["initial_state"] != null && json["initial_state"]["drawstate"] != null){
			this.undoStack.push(json.initial_state.drawstate);
		} else {
			this.undoStack.push(null);
		}
						
		//this.addEventListener(Event.ADDED, handleAdded);
		//p.handleAdded = function(event:Event){
		//this.removeEventListener(Event.ADDED, handleAdded);
		
		// Give this a light blue hue 
		this.background = new createjs.Shape();
		var g = this.background.graphics;
		g.setStrokeStyle(1).beginStroke(this.OUTLINE_COLOR).beginFill(this.BACK_COLOR).drawRect(0, 0, this.WIDTH, this.HEIGHT).endFill().endStroke();
		this.addChild(this.background);
		// add after the rest of the stuff so that cursor is on top
		// what's the last draw state?
		//totalDrawStates = json..drawstate.length();
		//currentDrawState = totalDrawStates-1;
			
		this.drawOobShapesFromJSON(json);
		this.drawPointsFromJSON(this.undoStack[this.undoStack.length-1]);
		this.drawSegmentsFromJSON(this.undoStack[this.undoStack.length-1]);
		this.findAllClosedPolygons ();
			
		//this.addEventListener(Event.ENTER_FRAME, handleFrame); // does a lot of stuff
		//}	
		
	}
	p.start = function(){
		this.shiftModes("pen");
	}
	
	/** Iterate through list of initial points in json doc */
	p.drawPointsFromJSON = function(drawstateNode){			
		if (drawstateNode != null && drawstateNode.points != null && drawstateNode.points.length>0){
			for (var pindex = 0; pindex < drawstateNode.points.length; pindex++){
				var node = drawstateNode.points[pindex];
				var pid="";
				if ( node["id"] != null ) pid = node["id"];
				var pinned=false, fixed=false, auto_ppinned=true;
				// can this point be deleted?
				if ( node["pinned"] != null && node["pinned"]==true) pinned = true;
				if ( node["fixed"] != null && node["fixed"]==true) fixed = true;
				if ( node["ppinned"] != null && node["ppinned"]==false) auto_ppinned = false;
				var px = node["x"];
				var py = node["y"];
						
				if (true){ // draw a point place on panel directly
					var p = this.newPoint(pid, pinned, fixed, auto_ppinned);
					if (px >= 1 || py >= 1){ p.x = px; } else {p.x = this.WIDTH * px}
					if (py >= 1 || py >= 1){ p.y = py; } else {p.y = this.HEIGHT * py}
				} 
			}		
		}
	}
		
	/** Iterate through list of initial segments in json doc */
	p.drawSegmentsFromJSON = function(drawstateNode){
		if (drawstateNode != null && drawstateNode.segments != null && drawstateNode.segments.length>0){ 
			for (var sindex = 0; sindex < drawstateNode.segments.length; sindex++){
				var node = drawstateNode.segments[sindex];	
				var sid="";
				if ( node["id"] != null ) sid = node["id"];
						
				var p1 = this.lookupPointByID(node["p1"]);
				var p2 = this.lookupPointByID(node["p2"]);
				if (p1 != null && p2 != null){
					this.newSegment(p1, p2, sid);
				} else {
					console.log("In constructing segment, point was not found, check json");
				}
			}		
		}
	}
		
	/** Iterate through list of out of bound shapes, and their points to create shapes on which a point may not be placed */
	p.drawOobShapesFromJSON = function(json){
		//console.log(json..oob.length());
		if (json["oob"] != null && json["oob"].length > 0){
			for (var node in json.oob){
				// only bother if we have more than two points in this shape
				if (node["points"] != null && node["points"].length >= 3){
					var _points = [];
					for (var pjson in node["points"]){
						if (pjson["x"] != null){var px = pjson["x"];}
						else { break; }
						if (px < 1) px = px * this.WIDTH;
						if (pjson["y"] != null){var py = pjson["y"];}
						if (py < 1) py = py * this.HEIGHT;
						else { break; }
						var p = new Point(px, py);
						_points.push(p);
					}
					var oobshape = new this.OobShape (_points);
					this.oobshapes.push(oobshape);
					this.addChild(oobshape);
				}
			}
		}
	}
				
	/** Go through array of points to find one that matches the given id */
	p.lookupPointByID = function(pid){
		for (var pindex = 0; pindex < this.drawPoints.length; pindex++){
			var p = this.drawPoints[pindex];
			if (p.id == pid) return p;
		}
		return null;
	}
		
	/////////////////////////////////////////////////////////// FUNCTIONS RELATING TO COMPONENTS (POINTS, SEGMENTS, POLYGONS)/////////////////////////
	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	/** Removes all points this.drawAngles and segments from the field */
	p.clear = function(){
		for (var i=this.drawPoints.length-1; i >= 0; i--){
			var p = this.drawPoints[i];
				this.deletePoint(p);
			}
		this.clearAllClosedPolygons();
	}
	
	//////////////////////////// POINTS /////////////////////////////////////////////////		

	/** Create a new point with a unique id or given id
	 */ 
	p.newPoint = function(id, pinned, fixed, auto_ppinned){
		id = id != null ? id : "no";
		pinned = pinned != null ? pinned : false;
		fixed = fixed != null ? fixed : false;
		auto_ppinned = auto_ppinned != null ? auto_ppinned : true;
			
		// update point count
		this.pointCount++;
			
		var pid;
		if (id != "no"){ // use given pid
			pid = id;
		} else{ // search for a unique name
			pid = "p"+ this.pointCount
		}
			
		var p = new DrawPoint(pid, pinned, fixed, auto_ppinned);
		this.drawPoints.push(p);
		if (this.cursor_tool == null){
			this.addChild(p);	
		} else {
			this.addChild(p);	
			//this.addChildAt(p,this.numChildren-1);	
		}
		//findAllClosedPolygons();		
		return p;
	}
	
	/** Delete point deletes points and all associated segments and angles */
	p.deletePoint = function(p){
		if (p != null && p.parent == this){
			var s = null;
			// first get rid of any segments that are attached to this point
			for (var i=drawSegments.length-1; i >= 0; i--){
				s = this.drawSegments[i];
				//console.log("segment", i,":", s.containsDrawPoint(p));
				if (s.containsDrawPoint(p)){
					// also get rid of segment reference in other points
					s.point2.removeSegment(s);
					s.point1.removeSegment(s);
					drawSegments.splice(i,1);
					this.removeChild(s);
				}
			}
				
			var a = null;
			// then angles
			for (i=drawAngles.length-1; i >= 0; i--){
				a = this.drawAngles[i]
				if (a.containsDrawPoint(p)){
					// also get rid of segment reference in other points
					a.point2.removeAngle(a);
					a.point1.removeAngle(a);
					a.pointC.removeAngle(a);
					this.drawAngles.splice(i,1);
					this.removeChild(a);
				}
			}
				
			drawPoints.splice(drawPoints.indexOf(p),1);
			this.removeChild(p);
			//findAllClosedPolygons();
		}
	}
	/** This function is used to determine if a point is a valid stopping point for a DrawPoint */
	p.isValidPoint  = function(_x, _y){
		if (_x > 0 && _x < this.WIDTH && _y > 0 && _y < this.HEIGHT){
			var _outOfBounds = true;
			// check to see if this point is in a shape
			var gpoint = {"x":_x, "y":_y};
			gpoint = this.localToGlobal(gpoint);
			for (var oobshape in this.oobshapes)
			{
				if (oobshape.hitTestPoint(gpoint.x, gpoint.y, true)) return false;
			}
			return true;
		} else
		{
			return false;				
		}
	}
	
	//////////////////////////// SEGMENTS /////////////////////////////////////////////////		

	/** Will create a new segment between two points, but also ensures that the segment is unique */
	p.newSegment = function(p1, p2, id, overrideUniquenessCheck){
		id = id != null ? id : "no";
		overrideUniquenessCheck = overrideUniquenessCheck != null ? overrideUniquenessCheck : false;
		
		var s = null;
		// Make sure this segment is not already created (i.e., has both points)
		var isNewSegment = true;
		if (!overrideUniquenessCheck){
			for (var i = 0; i < this.drawSegments.length; i++){
				s = this.drawSegments[i];
				if (s.containsDrawPoint(p1) && s.containsDrawPoint(p2)){
					isNewSegment = false; break;
				}
			}
		}
		if (isNewSegment){
			this.segmentCount++;
			var sid;
			if (id != "no"){ // use given pid
				sid = id;
			} else { // search for a unique name
				sid = "s"+ segmentCount;
			}
			s = new DrawSegment(p1, p2, sid);				
			this.drawSegments.push(s);
			//this.addChild(s);
			this.addChildAt(s, 1 + this.oobshapes.length + this.closedPolygons.length);
			// if this segment has any adjacent segments, i.e., segments attached to this segments point1 or point2, create drawAngles
			var _s;
			var a = null;
			if (p1.segmentcount > 1){
				for (var i = 0; i < p1.drawSegments.length; i++){
					_s = p1.drawSegments[i];
					if (s != _s){
						a = new DrawAngle(s, _s);
						//a.drawArc(20);
						this.addChildAt(a, 1 + this.drawSegments.length + this.oobshapes.length + this.closedPolygons.length);
						this.drawAngles.push(a);
					}
				}
			}
			if (p2.segmentcount > 1){
				for (var i = 0; i < p2.drawSegments.length; i++){
					_s = p2.drawSegments[i];
					if (s != _s){
						a = new DrawAngle(s, _s);
						//a.drawArc(20);
						this.addChildAt(a, 1 + this.drawSegments.length + this.oobshapes.length + this.closedPolygons.length);
						this.drawAngles.push(a);
					}
				}
			}
		}
		
		//findAllClosedPolygons();
		return(s);
	}
	/** Deletes given point, makes sure that any angles are updated, and references within drawpoints as well */
	p.deleteSegment  = function(ds, overridePinRequirement){
		overridePinRequirement = overridePinRequirement != null ? overridePinRequirement : false;
	
		// if this segment is suspended between two pinned points, cannot delete, send message
		if (!overridePinRequirement && ds.fixed){
			//this.parent.newMessage(this, "You cannot delete this segment.", mouseX, mouseY, MessageBox.EPHEMERAL_TYPE);
			return false;
		}
			
		var angs = new Array();
		// get any angles that include this segment
		for (var i=this.drawAngles.length-1; i >= 0; i--){
			var da = this.drawAngles[i];
			if (da.containsDrawSegment(ds)){
				// add to angs array
				angs.push(da);
				// remove from list and display
				this.drawAngles.splice(i, 1);
				this.removeChild(da);					
			}
		}
		// go through all points and remove any references to lost angles and this segment
		for (var dp in this.drawPoints){
			// segment
			dp.removeSegment(ds);
			for (da in angs){
				dp.removeAngle(da);
			}
		}
		// remove segment from display and list
		this.drawSegments.splice(drawSegments.indexOf(ds),1);
		this.removeChild(ds);
		
		return true;
	}
	
	//////////////////////////// CLOSED POLYGONS /////////////////////////////////////////////////		

	/** Function finds all closed polygons on the panel by iterating through all points and segements. Adds to array. Returns number of closed polygons. */
	p.findAllClosedPolygons = function()
	{
		this.clearAllClosedPolygons ();
		// iterate through all points
		for (var i=0; i < this.drawPoints.length; i++)
		{
			var dp = this.drawPoints[i];
			// use recursive function to follow tree of all segments
			this.findAllClosedPolygonsFromDrawPoint(new Array(dp));
		}
	}
	
		/** A recursive function that searches all (DrawSegment) connections to the given DrawPoint (wrapped in an array)
		 * Adds all new ClosedPolygons to array. Returns if any closed polygons found. */
		p.findAllClosedPolygonsFromDrawPoint = function(prevDrawPoints)
		{
			//console.log("find polygons", this.drawPoints.length, this.drawSegments.length, prevDrawPoints);
			var newDrawPoints = null
			var rootdp = prevDrawPoints[0];
			var dp = prevDrawPoints[prevDrawPoints.length-1];
			
			var cur_ds;
			var tdp, tds;
			
			// get the final drawsegment connecting the last two drawsegments
			if (prevDrawPoints.length > 1){
				tdp = prevDrawPoints[prevDrawPoints.length-2];
				for (var i = 0; i < dp.drawSegments.length; i++){
					tds = dp.drawSegments[i];
					if (tds.containsDrawPoint(tdp)){
						cur_ds = tds;
						break;
					}
				}
			}
			
			//console.log("this point id", dp.id,  "num segs", dp.drawSegments.length);
			//console.log("current draw point", dp.id, dp.drawSegments.length);
			//if (dp.drawSegments.length==2) console.log(dp.drawSegments[0].id,dp.drawSegments[1].id); 
			for (var i=0; i < dp.drawSegments.length; i++){
				var newpoint = null;
				var ds = dp.drawSegments[i];
				if (ds != cur_ds){
				//	console.log("iterate segments", ds.id);
					// two cases:
					// 1) This is the first call, we cannot close based on one segment
					if (prevDrawPoints.length == 1){
					//	console.log("1 point");
						// which of the two points is the newpoint?
						if (ds.point1 == dp && ds.point2 != dp){ newpoint = ds.point2;}
						else if (ds.point1 != dp && ds.point2 == dp){ newpoint = ds.point1;}
						if (newpoint != null)	{
							newDrawPoints = prevDrawPoints.slice();
							newDrawPoints.push(newpoint);
							//console.log("1", newDrawPoints);
							this.findAllClosedPolygonsFromDrawPoint(newDrawPoints);
						}
					} // 2) We are one segment removed from the root, we cannot link back to it yet, make sure new point is not root point
					else if (prevDrawPoints.length == 2){
					//	console.log("2 points");
						// which of the two points is the newpoint?
						//console.log(dp.id, ds.point1.id, ds.point2.id, rootdp);
						if (ds.point1 == dp && ds.point2 != dp && ds.point2 != rootdp){ newpoint = ds.point2;}
						else if (ds.point1 != dp && ds.point2 == dp && ds.point1 != rootdp){ newpoint = ds.point1;}
						if (newpoint != null)
						{
							newDrawPoints = prevDrawPoints.slice();
							newDrawPoints.push(newpoint);
							//console.log("2", newDrawPoints);
							this.findAllClosedPolygonsFromDrawPoint(newDrawPoints);
						} 
					}
					// 3) We have at least two removed, we can connect back to the root point and construct a new closed polygon
					else if (prevDrawPoints.length >= 3){
					//	console.log(prevDrawPoints.length, "points");
						var j;
						var p1, p2;
						var intersect = false;
						// which of the two points is the newpoint?
						if (ds.point1 == dp && ds.point2 != dp){ newpoint = ds.point2;}
						else if (ds.point1 != dp && ds.point2 == dp){ newpoint = ds.point1;}
						if (newpoint == rootdp) { 
							//console.log("return to start");
							// make sure that all segments from 1 to n-1 do no intersect
							for (j=1; j < prevDrawPoints.length-2; j++){
								p1 = prevDrawPoints[j];
								p2 = prevDrawPoints[j+1];
								
								// find the drawsegment between these two
								for (tds in p1.drawSegments){
									if(tds.containsDrawPoint(p2)){
										//console.log("last segment", ds.id, "compare to", tds.id, ds==tds, tds.hitTestObject(ds), tds.intersectsDrawSegment(ds));
										//if ( tds.hitTestObject(ds))
										if (tds.intersectsDrawSegment(ds)){
											intersect = true;
											break;
										}	
									}
								}
							}
							
							if (!intersect){
					//			console.log("create here");
								newDrawPoints = prevDrawPoints.slice();
								return(this.newClosedPolygon(newDrawPoints));
							}
						}						
						else // new point is not a return to root point, but have we seen it before, or does it intersect with a previous?, if not continue the traverse
						{	// skip root and current point
							var found = false;
							for (j=1; j < prevDrawPoints.length-1; j++)	{
								var prevdp = prevDrawPoints[j];
								if (prevdp == newpoint)	{
									found = true;
									break;
								}
							}
							
							// make sure that all segments from 1 to n-1 do no intersect
							for (j=0; j < prevDrawPoints.length-2; j++)	{
								p1 = prevDrawPoints[j];
								p2 = prevDrawPoints[j+1];
					//			console.log("previous", p1.id, p2.id)
								// find the drawsegment between these two
								for (tds in p1.drawSegments){
						//			console.log("draw segment", tds.id);
									if(tds.containsDrawPoint(p2)){
							//			console.log("this segment", ds.id, "compare to", tds.id, tds.hitTestObject(ds));
										if ( tds.hitTestObject(ds)){
											intersect = true;
											break;
										}	
									}
								}
							}
							if (!found && !intersect)
							{
								newDrawPoints = prevDrawPoints.slice();
								newDrawPoints.push(newpoint);
								//console.log("3+", newDrawPoints);
								this.findAllClosedPolygonsFromDrawPoint(newDrawPoints);
							}
						}
					}
				}
			}
			return false;
		}
	
	/** Constructs a new closed polygon with a set of drawpoints if those points do not already make one, returns true if new closed polygon is made and added to array */
	p.newClosedPolygon  = function(_drawPoints){
		//_drawPoints = MathUtilities.orderDrawPointsPolygon(_drawPoints); 
		var _points = DrawPoint.prototype.toGeomPoints(_drawPoints);
		// go through all closed polygons and make sure this set of points is new
		var found = false;
		for (var i = 0; i < this.closedPolygons.length; i++){
			var cpoly = this.closedPolygons[i];
			if (cpoly.containsEquivalentDrawPoints(_drawPoints)){
				found = true;
				break;
			}
		}
		if (!found)	{
			console.log("new closed", _drawPoints);
			var closedPolygon = new ClosedPolygon(_drawPoints);
			this.closedPolygons.push(closedPolygon);
			this.addChildAt(closedPolygon, 1 + this.oobshapes.length);
			return true;
		} else {
			//console.log("no");
			return false;
		}
	}
	/** Returns an array of closed polygons in which the given point is a member */
	p.getAllClosedPolygonsWithDrawPoint  = function(dp){
		var arr = new Array();
		for (var i = 0; i < this.closedPolygons.length; i++){
			var p = this.closedPolygons[i];
			if (p.containsDrawPoint(dp)) arr.push(p);
		}
		return arr;
	}
	/** Returns an array of closed polygons in which the given draw segment is a member */
	p.getAllClosedPolygonsWithDrawSegment = function(ds){
		var arr = new Array();
		for (var i = 0; i < this.closedPolygons.length; i++){
			var p = this.closedPolygons[i];
			if (p.containsDrawSegment(ds)) arr.push(p);
		}
		return arr;
	}
	/** Returns an array of closed polygons in which the given draw angle is a member */
	p.getAllClosedPolygonsWithDrawAngle  = function(da){
		var arr = new Array();
		for (var i = 0; i < this.closedPolygons.length; i++){
			var p = this.closedPolygons[i];
			if (p.containsDrawAngle(da)) arr.push(p);
		}
		return arr;
	}
	/** This function searches for all closed polygons with the given draw point, if found, removed from list and display 
	 *  Returns the number of polygons removed;
	 * */
	p.removeClosedPolygonWithDrawPoint = function(dp){
		var count = 0;
		for (var i=this.closedPolygons.length-1; i >= 0; i--){
			var p = this.closedPolygons[i];
			
			if (p.containsDrawPoint(dp)){
				count++;
				this.closedPolygons.splice(i, 1);
				if (p.parent == this) this.removeChild(p);
			}
		}
		return count;
	}
	/** Removes all closed polygons from display and off array */
	p.clearAllClosedPolygons = function(){
		console.log("remove", this.closedPolygons.length, "closed polygons");
		for (var i = 0; i < this.closedPolygons.length; i++){
			var p = this.closedPolygons[i];
			if (p.parent == this){ this.removeChild(p); console.log("remove this closed polygon", p);}
		}
		this.closedPolygons = new Array();
	}

	//////////////////////////// CHILD SHAPE GROWTH /////////////////////////////////////////////////		
	
	/** Sets up the growth of a new shape based on the current shape type selected */
	p.newChildPolygon = function(){
		console.log("dpanel, newChildPolygon", this.currentChildShapeType );
		if (this.currentClosedPolygon != null && this.currentChildShapeType != ""){
			this.currentChildPolygon = new ChildPolygon(this.currentClosedPolygon, this.currentChildShapeType,this.min_area);
			//currentChildPolygon.addEventListener(Event.COMPLETE, handleChildSuccess);
			//currentChildPolygon.addEventListener(Event.CANCEL, handleChildFailure);
			this.addChild(this.currentChildPolygon);
		}
	}
	/** The active child is stored */
	p.storeChild = function(){
		if (this.currentChildPolygon != null){
			// make sure this child isn't already on array
			if (this.childPolygons.indexOf(this.currentChildPolygon) < 0){
				this.childPolygons.push(this.currentChildPolygon);
			}
		}
	}
	p.resetChildren = function(){
		this.childPolygons = new Array();
	}
	/** An active child is cleared */
	p.clearChild = function(){
		if (this.currentChildPolygon != null){
			//currentChildPolygon.removeEventListener(Event.COMPLETE, handleChildSuccess);
			//currentChildPolygon.removeEventListener(Event.CANCEL, handleChildFailure);
			this.currentClosedPolygon.outline = false;
			this.currentClosedPolygon.highlight = false;
			//currentClosedPolygon.used = true;
			this.currentClosedPolygon.attachedType = this.currentChildShapeType;
			this.currentClosedPolygon = null;
			//currentChildShapeType = "";
			this.removeChild(currentChildPolygon);
			this.currentChildPolygon = null;
		}
	}
	
	///////////////////////////////// FUNCTIONS FOR TRANSITION /////////////////////////////////////////////		
		
	p.haltCursor = function(){this.cursor_tool.halt = true;}
	p.resumeCursor = function(){this.cursor_tool.halt = false;}
	/** 
	 * Goes through segments and angles to see whether validated properties need to be changed 
	 * */
	p.updateComponents = function(){
		var arr;
		var dp, da, ds, cp;
		/////////////////////////////////////////// UPDATE CLOSED POLYGONS ////////////////////////////////////////////////////////////
		if (this.pen_mode)
		{  // i.e., new closed polygon is possible
			if (this.cursor_tool.components != null){
				if (this.cursor_tool.components[0] instanceof DrawPoint){
					this.findAllClosedPolygonsFromDrawPoint(new Array(DrawPoint(this.cursor_tool.components[0])));
				} else if (this.cursor_tool.components[0] instanceof DrawSegment){
					this.removeClosedPolygonWithDrawPoint(DrawSegment(this.cursor_tool.components[0]).point1);
					this.removeClosedPolygonWithDrawPoint(DrawSegment(this.cursor_tool.components[0]).point2);
				} 
			}
		} else if (this.delete_mode)
		{ // i.e., a closed polygon may be removed
			if (this.cursor_tool.components != null){
				if (this.cursor_tool.components[0] instanceof DrawPoint){
					arr = this.getAllClosedPolygonsWithDrawPoint(this.cursor_tool.components[0]);
					//console.log("delete point", DrawPoint(this.cursor_tool.components[0]).id, "closed", arr);
					if (arr != null)
					{
						for (cp in arr)
						{
							cp.childPolygon = null;
							if (cp.attachedType != "")
							{
								this.parent.processCommand("child", "complete", this, new Array(cp.attachedType));
								cp.attachedType = "";
							}
						}
					}
					this.removeClosedPolygonWithDrawPoint(DrawPoint(this.cursor_tool.components[0]));
				} else if (this.cursor_tool.components[0] instanceof DrawSegment)
				{
					arr = this.getAllClosedPolygonsWithDrawSegment(this.cursor_tool.components[0]);
					//console.log("delete segment", DrawSegment(this.cursor_tool.components[0]).id, "closed", arr);
					if (arr != null)
					{
						for (cp in arr)
						{
							cp.childPolygon = null;
							if (cp.attachedType != "")
							{
								parent.processCommand("child", "complete", this, new Array(cp.attachedType));
								cp.attachedType = "";
							}
						}
					}
					this.removeClosedPolygonWithDrawPoint(this.cursor_tool.components[0].point1);
					this.removeClosedPolygonWithDrawPoint(this.cursor_tool.components[0].point2);
				} 
			}
		} else if (this.drag_mode || this.parallel_mode || this.length_mode || this.angle_mode || this.right_mode)
		{ // i.e., some close polygons may have changed, if so set polygon's used parameter back to false
			if (this.drag_mode)
			{
				for (dp in cursor_tool.components){
					//console.log("point changed", dp.id, "remove closed", arr);
					arr = this.getAllClosedPolygonsWithDrawPoint(dp);
					if (arr != null)
					{
						for (cp in arr)
						{
							cp.childPolygon = null;
							if (cp.attachedType != "")
							{
								this.parent.processCommand("child", "complete", this, new Array(cp.attachedType));
								cp.attachedType = "";
							}
							// make sure this closed polygon is still a polygon
							if (cp.containsIntersections())
							{
								//console.log("number of closed polygson before remove", this.closedPolygons.length);
								this.closedPolygons.splice(this.closedPolygons.indexOf(cp),1);
								if (cp.parent == this) this.removeChild(cp);
								//console.log("number of closed polygson after remove", this.closedPolygons.length);
							} 							
							
						}
					}
					// add on any new polygons made by this drag
					//this.removeClosedPolygonWithDrawPoint(dp);
					//console.log("number of closed polygson before add", this.closedPolygons.length);
					this.findAllClosedPolygonsFromDrawPoint(new Array(dp));
					//console.log("number of closed polygson after add", this.closedPolygons.length);
				}
			} else if (this.parallel_mode || this.length_mode)
			{
				for (ds in cursor_tool.components)
				{
					arr = this.getAllClosedPolygonsWithDrawSegment(ds);
					if (arr != null)
					{
						for (cp in arr)
						{
							cp.childPolygon = null;
							if (cp.attachedType != "")
							{
								this.parent.processCommand("child", "complete", this, new Array(cp.attachedType));
								cp.attachedType = "";
							}
							if (cp.containsIntersections())
							{
								this.closedPolygons.splice(this.closedPolygons.indexOf(cp),1);
								if (cp.parent == this) this.removeChild(cp);
							} 
						}
					}
					this.findAllClosedPolygonsFromDrawPoint(new Array(ds.point1));
					this.findAllClosedPolygonsFromDrawPoint(new Array(ds.point2));
				}
			} else if (this.angle_mode || this.right_mode)
			{
				for (da in cursor_tool.components)
				{
					arr = this.getAllClosedPolygonsWithDrawAngle(da);
					if (arr != null)
					{
						for (cp in arr)
						{
							cp.childPolygon = null;
							if (cp.attachedType != "")
							{
								this.parent.processCommand("child", "complete", this, new Array(cp.attachedType));
								cp.attachedType = "";
							}
							if (cp.containsIntersections())
							{
								this.closedPolygons.splice(this.closedPolygons.indexOf(cp),1);
								if (cp.parent == this) this.removeChild(cp);									
							} 
						}
					}
					this.findAllClosedPolygonsFromDrawPoint(new Array(da.point1));
					this.findAllClosedPolygonsFromDrawPoint(new Array(da.point2));
					this.findAllClosedPolygonsFromDrawPoint(new Array(da.pointC));
				}
			}
		}
		
		// redraw all closed polygons
		console.log(this.closedPolygons.length, "closed polygons");
		for (cp in this.closedPolygons){cp.redraw();}
		/////////////////////////////////////////// UPDATE CONGRUENCY, PARALLEL, RIGHT ANGLE RELATIONSHIPS ////////////////////////////
		//cursor_tool.removeEventListener(Event.COMPLETE, handleToolComplete);
		if (this.parallel_mode)
		{
			arr = cursor_tool.components;
			if (arr != null && arr.length > 1){
				parallelCount++;	
				arr[0].addParallelPartner(arr[1], parallelCount);
			}
			this.removeChild(this.cursor_tool);
			cursor_tool = new ParallelTool(drawSegments, oobshapes, this.tool_threshold_multiplier*this.parallel_threshold_degrees);
			this.addChild(this.cursor_tool);
		} else if (this.length_mode){
			arr = cursor_tool.components;
			// just need to do once
			if (arr != null && arr.length > 1) 
			{
				congruentSegmentCount++;
				arr[0].addCongruentPartner(arr[1], congruentSegmentCount);
			}
			this.removeChild(this.cursor_tool);
			cursor_tool = new LengthTool(drawSegments, oobshapes, this.tool_threshold_multiplier*this.length_threshold_pixels);
			this.addChild(this.cursor_tool);
		} else if (this.angle_mode)
		{
			arr = cursor_tool.components;
			if (arr != null && arr.length > 1)
			{
				congruentAngleCount++;
				congruentAngleCount = arr[0].addCongruentPartner(arr[1], congruentAngleCount);
			}
			this.removeChild(this.cursor_tool);
			cursor_tool = new AngleTool(drawAngles, oobshapes, this.tool_threshold_multiplier*this.angle_threshold_degrees);
			this.addChild(this.cursor_tool);
		} else if (this.right_mode)
		{
			arr = cursor_tool.components;
			if (arr != null && arr.length > 0) DrawAngle(arr[0]).right = true;
			this.removeChild(this.cursor_tool);
			cursor_tool = new RightTool(drawAngles, oobshapes, this.tool_threshold_multiplier*this.angle_threshold_degrees);
			this.addChild(this.cursor_tool);
		}
		//////////////////////////////////// UPDATE MARKINGS ON SEGMENTS AND ANGLES ////////////////////////////////////////////////////////
		// since we have adjusted something (perhaps) go through all segments and angles and check existing congruencies and parallel lines
		var changed = false;
		/////////// congruent sides //////////////////////
		for (ds in this.drawSegments)
		{
			if (ds.checkExistingCongruencies(this.length_threshold_pixels)) changed = true;
		}
		// if a change has been made start over with counts, first set counts to zero (which won't affect partner relationships)
		if (changed) {
			for (ds in this.drawSegments){
				ds.congruentCount = 0;
			}
			congruentSegmentCount=0;
			for (ds in this.drawSegments) {
				congruentSegmentCount++;
				//console.log("congruentSegmentCount", congruentSegmentCount);
				var _count = ds.setMinimumCongruentCount(congruentSegmentCount);
				if (_count > 0) { 	congruentSegmentCount = Math.max(_count, congruentSegmentCount); }
				else { congruentSegmentCount--;} // reduce so that on the next iteration will be increased back to current value
			}
		}
		/////////// parallel sides //////////////////////
		changed = false;
		for (ds in this.drawSegments)
		{
			if (ds.checkExistingParallels(this.parallel_threshold_degrees)) changed = true;
		}
		// if a change has been made start over with counts, first set counts to zero (which won't affect partner relationships)
		if (changed)
		{
			for (ds in this.drawSegments)
			{
				ds.parallelCount = 0;
			}
			parallelCount=0;
			for (ds in this.drawSegments)
			{
				parallelCount++;
				//console.log("parallelSegmentCount", parallelSegmentCount);
				_count = ds.setMinimumParallelCount(parallelCount);
				if (_count > 0) { 	parallelCount = Math.max(_count, parallelCount); }
				else { parallelCount--;} // reduce so that on the next iteration will be increased back to current value
			}
		}
		/////////// right angles //////////////////////
		changed = false;
		for (da in this.drawAngles)
		{
			if (da.checkExistingRight(this.right_threshold_degrees)) changed = true;
		}
		
		/////////// congruent angles //////////////////////
		changed = false;
		for (da in this.drawAngles)
		{
			if (da.checkExistingCongruencies(this.angle_threshold_degrees)) changed = true;
		}
		// if a change has been made start over with counts, first set counts to zero (which won't affect partner relationships)
		if (changed)
		{
			for (da in this.drawAngles){
				da.setCongruentCount(0);
			}
			congruentAngleCount=0;
			for (da in this.drawAngles){
				congruentAngleCount++;
				//console.log("congruentAngleCount", congruentAngleCount);
				_count = da.setMinimumCongruentCount(congruentAngleCount);
				if (_count > 0) { 	congruentAngleCount = Math.max(_count, congruentAngleCount); }
				else { congruentAngleCount--;} // reduce so that on the next iteration will be increased back to current value
			}
		}
		
		if (!polygonSelection_mode)
		{
			//findAllClosedPolygons();
		} else
		{
			if (this.cursor_tool.components != null)
			{
				this.currentClosedPolygon = ClosedPolygon(this.cursor_tool.components[0]);
				if (currentChildShapeType != "") newChildPolygon();
			}
		}	
	}
	
	/** Make this a separate function from the handler so that it can be called by parent */
	p.completeTool = function()
	{
		
		updateComponents();
		pen_mode = false; this.drag_mode = false; this.delete_mode = false; this.pin_mode = false; this.parallel_mode = false; this.length_mode = false; this.angle_mode = false; this.right_mode = false; polygonSelection_mode = false;
		if (this.cursor_tool != null)
		{
			//if (this.cursor_tool.hasEventListener(Event.COMPLETE)) cursor_tool.removeEventListener(Event.COMPLETE, handleToolComplete);
			this.removeChild(this.cursor_tool); 
			cursor_tool = null;
		}
		//this.parent.processCommand(modeName, "complete", this);			
	}
	
	p.setChildType = function(shapeType)
	{
		currentChildShapeType = shapeType;
		//console.log("setChildType", currentChildShapeType, currentClosedPolygon);
		//if (currentChildShapeType != "" && currentClosedPolygon != null)
		//{
		//	newChildPolygon();	
		//	return true;
		//} else
		//{
			return false;
		//}
	}
	p.setChildClosedPolygon = function(closedPolygon)
	{
		// if we are turning off a current polygon, turn off highlighting and outlining
		if (closedPolygon == null && currentClosedPolygon != null)
		{
			currentClosedPolygon.highlight = false;
		}
		currentClosedPolygon = closedPolygon;
		//console.log("setChildClosedPolygon", currentChildShapeType, currentClosedPolygon);
		if (currentChildShapeType != "" && currentClosedPolygon != null)
		{
			newChildPolygon();	
			return true;
		} else 
		{
			return false;
		}
	}
	/** This function changes the type of tool that is being applied on the panel 
	 *	The shapeType parameter is used for the outlining mode.
	 */
	p.shiftModes = function(_modeName, shapeType){
		shapeType = shapeType != null ? shapeType : "";
		var p;
		var s;
		var a;
		
		var modeName = this.modeName = _modeName;
		
		switch (modeName)
		{
			case "pen":
				this.pen_mode = true;
				this.cursor_tool = new PenTool(this.drawPoints, this.drawSegments, this.oobshapes, this.parent.free_points);
				break;			
			case"drag":
				this.drag_mode = true;
				this.cursor_tool = new DragTool(this.drawPoints, this.oobshapes);
				break;
			case "delete":
				this.delete_mode = true;
				this.cursor_tool = new DeleteTool(this.drawPoints, this.drawSegments, this.parent.free_points);
				break;
			case "pin":
				this.pin_mode = true;
				this.cursor_tool = new PinTool(this.drawPoints);
				break;
			case "parallel":
				this.parallel_mode = true;
				this.cursor_tool = new ParallelTool(this.drawSegments, this.oobshapes, this.parallel_threshold_multiplier*this.parallel_threshold_degrees);
				break;
			case "length":
				this.length_mode = true;
				this.cursor_tool = new LengthTool(this.drawSegments, this.oobshapes, this.length_threshold_multiplier*this.length_threshold_pixels);
				break;	
			case "angle":
				this.angle_mode = true;
				this.cursor_tool = new AngleTool(this.drawAngles, this.oobshapes, this.angle_threshold_multiplier*this.angle_threshold_degrees);
				break;
			case "right":
				this.right_mode = true;
				this.cursor_tool = new RightTool(this.drawAngles, this.oobshapes, this.right_threshold_multiplier*this.right_threshold_degrees);
				break;
			case "polygonSelection":
				this.polygonSelection_mode = true;
				this.cursor_tool = new PolygonSelectionTool(this.closedPolygons);
				break;
			case "clear":
				this.clear();
				break;
			default:
				return false;
		}
		if (this.cursor_tool != null)
		{
			//cursor_tool.addEventListener(Event.COMPLETE, handleToolComplete);
			this.addChild(this.cursor_tool);
			this.cursor_tool.start();
		}
		return true;
	}

	
	
////////////////////////////////////////////////////	DEAL WITH STATE OF GAME ///////////////////////////////////////
	/////////////////////////////////////////// 	DO NOT CALL DIRECTLY (CALLED FROM PARENT) ////////////////////////
	/** This function adds a new set of nodes to the json, at the current level */
	p.appendNewDrawState = function(saveNode, cmd_count, free_points, updateStack){
		updateStack = updateStack != null ? updateStack : true;
		currentDrawState++; // append to the end
		// create a node for a new draw state, add points then segments
		var node = {"num":this.currentDrawState, "command_count":cmd_count, "free_points":free_points, "points":[], "segments":[]};
		// go through points to append to node
		
		for (var i=0; i < this.drawPoints.length; i++){
			var p = this.drawPoints[i];
			var pnode = {"id":p.id, "x":p.x, "y":p.y};
			if (p.pinned) pnode.pinned = true;
			if (p.fixed) pnode.fixed = true;
			if (!p.ppinned) pnode.ppinned = false;
			//<point id=p{p.id} x={p.x} y={p.y} pinned={p.pinned} fixed={p.fixed} />;
			node.points.push(pnode);
		}
		
		for (i=0; i < this.drawSegments.length; i++){
			var s = this.drawSegments[i];
			var snode = {"id":s.id, "p1":String(s.point1.id), "p2":String(s.point2.id)};
			node.points.push(snode);
		}
		if (updateStack){
			this.undoStack.push(node); // put this on the undo stack
			this.redoStack = new Array(); // clear the redo stack
		}
		//append to itemjson
		saveNode.appendChild(node);
		return (saveNode);
	}
	
	/** Go through all children, add any that aren't currently saved */
	p.saveChildren = function()
	{
		/*
		var saveCount = 0;
		var node = new JSON();
		node = 
			<child_shapes>
			</child_shapes>;
		// first is there a node for children
		if (json..child_shapes.length()==0)
		{
			json.appendChild(node);
		} else
		{
			json.replace("child_shapes", node);
			//json..child_shapes[0].replaceChildren(new JSON());	
		}
		//console.log(json);
		
		// look for closed polygons with child references
		for (var cp in this.closedPolygons)
		{
			if (cp.used)
			{
				saveCount++;
				// place a text representation of this closedPolygon
				node = new JSON();
				node = <child_shape> </child_shape>;
				node.@id = String("c_"+this.parent.id+"_"+saveCount);
				node.@type = cp.attachedType;
				node.@color = cp.childPolygon.color;
				var pnode;
				var cpoints = MathUtilities.orderPointsPolygon(cp.minimizedPoints);
				//console.log("Child points", cp.minimizedPoints);
				for (var p in cpoints)
				{
					pnode = new JSON;
					pnode = <point/>;
					pnode.@x = p.x;
					pnode.@y = p.y;
					node.appendChild(pnode);
				}
				json.child_shapes[0].appendChild(node);
			}
		}
		//console.log(json);
		//console.log(this.parent);
		//ShapeProductionTask(parent.parent.parent.parent).saveJSON();
		return saveCount;
		*/
	}
	
	///// UN-DOING AND RE-DOING
	p.gotoPreviousState = function()
	{
		/*
		if (this.undoStack.length > 0)
		{
			clear();
			//take the last object on the undo stack off, put it on the redo stack, then act upon the new top of the undo stack.
			//currentDrawState--;
			//console.log(this.undoStack.length);
			var node;
			if (this.undoStack.length > 1) 
			{
				node = this.undoStack.pop();
				this.redoStack.push(node);
			}
			//console.log(this.undoStack.length);
			var lastNode = this.this.undoStack[this.undoStack.length-1];
			this.drawPointsFromJSON(lastNode);
			this.drawSegmentsFromJSON(lastNode);
			this.findAllClosedPolygons();
			//console.log(node);
			console.log(lastNode);
			//console.log(lastNode["free_points"].length());
			if (lastNode["free_points"] != null){ this.parent.free_points = lastNode["free_points"]; }
			if (this.pen_mode){ this.removeChild(this.cursor_tool); cursor_tool = new PenTool(drawPoints, this.drawSegments, oobshapes, this.parent.free_points); this.addChild(this.cursor_tool);}
			else if (this.delete_mode){ this.removeChild(this.cursor_tool); cursor_tool = new DeleteTool(drawPoints, this.drawSegments, this.parent.free_points); this.addChild(this.cursor_tool);}
			
			return true;
		} else
		{
			return false;
		}
		*/
	}
	p.gotoFirstState = function()
	{
		/*
		if (this.undoStack.length > 0)
		{
			clear();
			//currentDrawState=0;
			// go through all elements on the undo stack and push them onto the redo stack
			for (var i=this.undoStack.length-1; i > 0; i--)
			{
				var node = this.undoStack.pop();
				this.redoStack.push(node);
			}
			var lastNode = this.undoStack[this.undoStack.length-1];
			drawPointsFromJSON(lastNode);
			drawSegmentsFromJSON(lastNode);
			findAllClosedPolygons();
			if (lastNode["free_points"] != null){ this.parent.free_points = lastNode["free_points"]; }
			if (this.pen_mode){ this.removeChild(this.cursor_tool); cursor_tool = new PenTool(drawPoints, this.drawSegments, oobshapes, this.parent.free_points); this.addChild(this.cursor_tool);}
			else if (this.delete_mode){ this.removeChild(this.cursor_tool); cursor_tool = new DeleteTool(drawPoints, this.drawSegments, this.parent.free_points); this.addChild(this.cursor_tool);}
			return true;
		} else
		{
			return false;
		}
		*/
	}
	p.gotoNextState = function()
	{
		/*
		if (this.redoStack.length > 0)
		{
			clear();
			//currentDrawState++;
			// take the last object off the redo stack and place on the undo stack
			var node = this.redoStack.pop();
			this.undoStack.push(node);
			var lastNode = this.undoStack[this.undoStack.length-1];
			drawPointsFromJSON(lastNode);
			drawSegmentsFromJSON(lastNode);
			findAllClosedPolygons();
			if (lastNode["free_points"] != null){ this.parent.free_points = lastNode["free_points"];}
			if (this.pen_mode){ this.removeChild(this.cursor_tool); cursor_tool = new PenTool(drawPoints, this.drawSegments, oobshapes, this.parent.free_points); this.addChild(this.cursor_tool);}
			else if (this.delete_mode){ this.removeChild(this.cursor_tool); cursor_tool = new DeleteTool(drawPoints, this.drawSegments, this.parent.free_points); this.addChild(this.cursor_tool);}
			return true;
		} else
		{
			return false;
		}
		*/
	}
	p.gotoLastState = function()
	{
		/*
		if (this.redoStack.length > 0)
		{
			clear();
			//currentDrawState = totalDrawStates-1;
			for (var i=this.redoStack.length-1; i > 0; i--)
			{
				var node = this.redoStack.pop();
				this.undoStack.push(node);
			}
			var lastNode = this.undoStack[this.undoStack.length-1];
			drawPointsFromJSON(lastNode);
			drawSegmentsFromJSON(lastNode);
			findAllClosedPolygons();
			if (lastNode["free_points"] != null){ this.parent.free_points = lastNode["free_points"]; }
			if (this.pen_mode){ this.removeChild(this.cursor_tool); cursor_tool = new PenTool(drawPoints, this.drawSegments, oobshapes, this.parent.free_points); this.addChild(this.cursor_tool);}
			else if (this.delete_mode){ this.removeChild(this.cursor_tool); cursor_tool = new DeleteTool(drawPoints, this.drawSegments, this.parent.free_points); this.addChild(this.cursor_tool);}
			return true;
		} else
		{
			return false;
		}
		*/
	}		
	
	p._tick = function(){
		this.Container_tick();
		// Are we in bounds?
		if (this.mouseX >= 0 && this.mouseY >= 0 && this.mouseX <= this.WIDTH && this.mouseY <= this.HEIGHT){
			// just coming back in
			if (this.outOfPanel) {
				this.outOfPanel = false;
				//console.log("cursor_tool", cursor_tool);
				if (this.cursor_tool != null){
					//Mouse.hide();
					this.cursor_tool.alpha = 1;
				} else{
					//Mouse.show();
				}
			}
			if (this.cursor_tool != null) this.cursor_tool.process({x:this.mouseX, y:this.mouseY});
		} else {
			if (!this.outOfPanel)
			{
				this.outOfPanel = true;
				//Mouse.show();
				if (this.cursor_tool != null)
				{
					this.cursor_tool.alpha = 0;
				}
			}
		}
	}
	
	window.DrawPanel = DrawPanel;
}(window));