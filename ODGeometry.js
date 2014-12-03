(function (window)
{
	/** Creates a canvas space for dynamic geometry */
	function ODGeometry (width_px, height_px, item_id) {
		this.initialize(width_px, height_px, item_id);
	}
	var p = ODGeometry.prototype = {};
	var stage;
	
	p.initialize = function(width_px, height_px, item_id){
		console.log(width_px, height_px, item_id);
		var canvas = document.getElementById("geoCanvas");
		canvas.width = width_px;
		canvas.height = height_px;
		this.unit = width_px/700;
		stage = new createjs.Stage(canvas);
		createjs.Ticker.addEventListener("tick", this.tick);
		$.getJSON("/geometry/OpenDynamicGeometry/items/"+item_id+".json", function(json) {
			window.ODGeometry.prototype.loadItem(json);
		});		
	};
	
	/** Parses json representing an item, loads all primitives and tools */
	p.loadItem = function(json){
		/*
		var p1 = new DrawPoint("p1", false);
		var p2 = new DrawPoint("p2", false);
		stage.addChild(p1);
		p1.x = 200;
		p1.y = 200;
		stage.addChild(p2);
		p2.x = 100;
		p2.y = 100;
		var s1 = new DrawSegment(p1, p2, "s1");
		stage.addChild(s1);
		*/
		// how many free points can we draw, relevant to both tool menu and drawing menu
		// first check the last save state
		if (typeof json["free_points"] === "number"){stage.free_points = json["free_points"];} 
		else {stage.free_points = -1;}
		
		stage.drawPanel = new DrawPanel(stage.canvas.width, stage.canvas.height, json, true, true);
		stage.addChild(stage.drawPanel);
		stage.drawPanel.start();
	}
	
	p.tick = function(){
		stage.update(); 
	}

	
	window.ODGeometry = ODGeometry;
}(window));