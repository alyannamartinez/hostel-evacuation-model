var WINDOWBORDERSIZE = 10;
var HUGE = 999999; //Sometimes useful when testing for big or small numbers
var animationDelay = 200; //controls simulation and transition speed
var isRunning = false; // used in simStep and toggleSimStep
var surface; // Set in the redrawWindow function. It is the D3 selection of the svg drawing surface
var simTimer; // Set in the initialization function

//The drawing surface will be divided into logical cells
var maxCols = 40;
var cellWidth; //cellWidth is calculated in the redrawWindow function
var cellHeight; //cellHeight is calculated in the redrawWindow function

// Images used for our model
const urlresident = "images/student.png";
const urlstairs = "images/staircase.png"

// function to create sequence between two numbers
function range(start, end, step = 1) {
	const len = Math.floor((end-start) / step) + 1
	return Array(len).fill().map((_, idx) => start + (idx * step))
}

// area of hostel
var starthostelrow = 2;
var numfloor = 12;
var lengthhall = 30;
var starthallcol = 9 
var startstairscol = starthallcol+lengthhall; 

//statistics  position
var statsRow = starthostelrow+numfloor+1.5;
var statsCol = 14;

// where the residents will 'enter' (coming from their rooms) - represented by the different rows
var arriveRow = range(starthostelrow, starthostelrow+numfloor-1, 1)

// number of people on each floor
var maxresidents = Array.from(new Array(12), (x, i) => i + 10);
const SPACE = 0
const FULL = 1
var numpeople = []

for (i = 0; i < numfloor; i++) {
	var newpeople ={"floor":"floor "+(i+1), "row":arriveRow[numfloor-i-1], "people":maxresidents[i], "state": SPACE};
	numpeople.push(newpeople); 
  }

// all possible combinations of waiting spots in the hallway
var colhall = range(starthallcol, starthallcol+lengthhall-1, 1)
const EMPTY=0;
const OCCUPIED=1;
var waitingSpots = []

for (i = 0; i < numfloor; i++) {
	for (j = 0; j < lengthhall; j++){
		var newspots ={"floor":"floor "+(i+1), "row":arriveRow[numfloor-i-1], "col":colhall[j], "state":EMPTY};
	    waitingSpots.push(newspots); 
	}
  }

// all possible combinations of waiting spots in the stairs
var stairSpots = []

for (i = 0; i < numfloor; i++) {
	var newstair ={"floor":"floor "+(i+1), "row":arriveRow[numfloor-i-1], "col":startstairscol, "state":EMPTY};
	    stairSpots.push(newstair); 
  }

// STATES
const INROOM=0; // resident starts from room
const WAITING=1; // resident waiting in hallway (to go into the stairs)
const INSTAIRCASE =2; // resident moving inside the stairs
const OUTSIDESTAIRCASE=3; // resident reaches outside the stairs
const EXITING=4; // resident moving towards evacuation area
const ESCAPED = 5; // resident has reached evacuation area

// We can section our screen into different areas. In this model, the hallway and the staircase are separate.
var areas =[
	{"label":"Hallway","startRow":starthostelrow,"numRows":numfloor,"startCol":starthallcol,"numCols":lengthhall,"color":"rgb(134, 70, 108)"},
	{"label":"Staircase","startRow":starthostelrow,"numRows":numfloor,"startCol":startstairscol,"numCols":1,"color":"rgb(175, 131, 174)"}	
   ]

var currentTime = 0;

var statistics = [
{"name":"Average time to escape: ","location":{"row":statsRow,"col":statsCol},"cumulativeValue":0,"count":0},
{"name":"Total time for everyone to escape: ","location":{"row":statsRow+1,"col":statsCol},"cumulativeValue":0,"count":0},
//{"name":"Average time spent in the hallway: ","location":{"row":statsRow+2,"col":statsCol},"cumulativeValue":0,"count":0},
// {"name":"Number of Students","location: ":{"row":statsRow+2,"col":startstairscol+1},"cumulativeValue":0,"count":0}
];

// The probability of a resident leaving their room
var probArrival = 1;

// This next function is executed when the script is loaded. It contains the page initialization code.
(function() {
	// Your page initialization code goes here
	// All elements of the DOM will be available here
	window.addEventListener("resize", redrawWindow); //Redraw whenever the window is resized
	simTimer = window.setInterval(simStep, animationDelay); // call the function simStep every animationDelay milliseconds
	redrawWindow();
})();

// We need a function to start and pause the the simulation.
function toggleSimStep(){ 
	//this function is called by a click event on the html page. 
	// Search BasicAgentModel.html to find where it is called.
	isRunning = !isRunning;
	console.log("isRunning: "+isRunning);
}

function redrawWindow(){
	isRunning = false; // used by simStep
	window.clearInterval(simTimer); // clear the Timer
	animationDelay = 550 - document.getElementById("slider1").value;
	probArrival = document.getElementById("slider2").value; //Parameters are no longer defined in the code but through the sliders
	numpeople[0].people = Number(document.getElementById("input1").value);
	numpeople[1].people = Number(document.getElementById("input2").value);
	numpeople[2].people = Number(document.getElementById("input3").value);
	numpeople[3].people = Number(document.getElementById("input4").value);
	numpeople[4].people = Number(document.getElementById("input5").value);
	numpeople[5].people = Number(document.getElementById("input6").value);
	numpeople[6].people = Number(document.getElementById("input7").value);
	numpeople[7].people = Number(document.getElementById("input8").value);
	numpeople[8].people = Number(document.getElementById("input9").value);
	numpeople[9].people = Number(document.getElementById("input10").value);
	numpeople[10].people = Number(document.getElementById("input11").value);
	numpeople[11].people = Number(document.getElementById("input12").value);

	simTimer = window.setInterval(simStep, animationDelay); // call the function simStep every animationDelay milliseconds
	
	// Re-initialize simulation variables
	
	currentTime = 0;
	statistics[0].cumulativeValue=0;
	statistics[0].count=0;
	statistics[1].cumulativeValue=0;
	statistics[1].count=0;
	residents = [];

	//resize the drawing surface; remove all its contents; 
	var drawsurface = document.getElementById("surface");
	var creditselement = document.getElementById("credits");
	var w = window.innerWidth;
	var h = window.innerHeight;
	var surfaceWidth =(w - 3*WINDOWBORDERSIZE);
	var surfaceHeight= (h-creditselement.offsetHeight - 3*WINDOWBORDERSIZE);
	
	drawsurface.style.width = surfaceWidth+"px";
	drawsurface.style.height = surfaceHeight+"px";
	drawsurface.style.left = WINDOWBORDERSIZE/2+'px';
	drawsurface.style.top = WINDOWBORDERSIZE/2+'px';
	drawsurface.style.border = "thick solid #0000FF"; //The border is mainly for debugging; okay to remove it
	drawsurface.innerHTML = ''; //This empties the contents of the drawing surface, like jQuery erase().
	
	// Compute the cellWidth and cellHeight, given the size of the drawing surface
	numCols = maxCols;
	cellWidth = surfaceWidth/numCols;
	numRows = Math.ceil(surfaceHeight/cellWidth);
	cellHeight = surfaceHeight/numRows;
	
	// In other functions we will access the drawing surface using the d3 library. 
	//Here we set the global variable, surface, equal to the d3 selection of the drawing surface
	surface = d3.select('#surface');
	surface.selectAll('*').remove(); // we added this because setting the inner html to blank may not remove all svg elements
	surface.style("font-size","100%");
	// rebuild contents of the drawing surface
	updateSurface();	
};

// The window is resizable, so we need to translate row and column coordinates into screen coordinates x and y
function getLocationCell(location){
	var row = location.row;
	var col = location.col;
	var x = (col-1)*cellWidth; //cellWidth is set in the redrawWindow function
	var y = (row-1)*cellHeight; //cellHeight is set in the redrawWindow function
	return {"x":x,"y":y};
}

function updateSurface(){
	// This function is used to create or update most of the svg elements on the drawing surface.
	// See the function removeDynamicAgents() for how we remove svg elements
	
	//Select all svg elements of class "resident" and map it to the data list called residents
	var allresidents = surface.selectAll(".resident").data(residents);
	
	// If the list of svg elements is longer than the data list, the excess elements are in the .exit() list
	// Excess elements need to be removed:
	allresidents.exit().remove(); //remove all svg elements associated with entries that are no longer in the data list
	// (This remove function is needed when we resize the window and re-initialize the residents array)
	 
	// If the list of svg elements is shorter than the data list, the new elements are in the .enter() list.
	// The first time this is called, all the elements of data will be in the .enter() list.
	// Create an svg group ("g") for each new entry in the data list; give it class "resident"
	var newresidents = allresidents.enter().append("g").attr("class","resident"); 
	//Append an image element to each new resident svg group, position it according to the location data, and size it to fill a cell
	// Also note that we can choose a different image to represent the resident based on the resident type
	newresidents.append("svg:image")
	 .attr("x",function(d){var cell= getLocationCell(d.location); return cell.x+"px";})
	 .attr("y",function(d){var cell= getLocationCell(d.location); return cell.y+"px";})
	 .attr("width", Math.min(cellWidth,cellHeight)+"px")
	 .attr("height", Math.min(cellWidth,cellHeight)+"px")
	 .attr("xlink:href",function(d){return urlresident;})
	
	// For the existing residents, we want to update their location on the screen 
	// but we would like to do it with a smooth transition from their previous position.
	// D3 provides a very nice transition function allowing us to animate transformations of our svg elements.
	
	//First, we select the image elements in the allresidents list
	var images = allresidents.selectAll("image");
	// Next we define a transition for each of these image elements.
	// Note that we only need to update the attributes of the image element which change
	images.transition()
	 .attr("x",function(d){var cell= getLocationCell(d.location); return cell.x+"px";})
	 .attr("y",function(d){var cell= getLocationCell(d.location); return cell.y+"px";})
	 .duration(animationDelay).ease('linear'); // This specifies the speed and type of transition we want.
 
	// residents will leave the clinic when they have been discharged. 
	// That will be handled by a different function: removeDynamicAgents
	
	// The simulation should serve some purpose 
	// so we will compute and display the average length of stay of each resident type.
	// We created the array "statistics" for this purpose.
	// Here we will create a group for each element of the statistics array (two elements)
	var allstatistics = surface.selectAll(".statistics").data(statistics);
	var newstatistics = allstatistics.enter().append("g").attr("class","statistics");
	// For each new statistic group created we append a text label
	newstatistics.append("text")
	.attr("x", function(d) { var cell= getLocationCell(d.location); return (cell.x+cellWidth)+"px"; })
    .attr("y", function(d) { var cell= getLocationCell(d.location); return (cell.y+cellHeight/2)+"px"; })
    .attr("dy", ".35em")
    .text(""); 
	
	// The data in the statistics array are always being updated.
	// So, here we update the text in the labels with the updated information.
	allstatistics.selectAll("text").text(function(d) {
		var avgLengthOfStay = d.cumulativeValue/(Math.max(1,d.count)); // cumulativeValue and count for each statistic are always changing
		return d.name+avgLengthOfStay.toFixed(1); }); //The toFixed() function sets the number of decimal places to display

	// Finally, we would like to draw boxes around the different areas of our system. We can use d3 to do that too.
	var allareas = surface.selectAll(".areas").data(areas);
	var newareas = allareas.enter().append("g").attr("class","areas");
	// For each new area, append a rectangle to the group
	newareas.append("rect")
	.attr("x", function(d){return (d.startCol-1)*cellWidth;})
	.attr("y",  function(d){return (d.startRow-1)*cellHeight;})
	.attr("width",  function(d){return d.numCols*cellWidth;})
	.attr("height",  function(d){return d.numRows*cellWidth;})
	.style("fill", function(d) { return d.color; })
	.style("stroke","black")
	.style("stroke-width",1);


	//////////**********
	var allStairs = surface.selectAll(".WaitingStairs").data(stairSpots);
	allStairs.exit().remove(); //remove all svg elements associated with entries that are no longer in the data list
	var newallStairs = allStairs.enter().append("g").attr("class","WaitingStairs");
	newallStairs.append("svg:image")
	.attr("x", function(d){return (d.col-1)*cellWidth;})
	.attr("y",  function(d){return (d.row-1)*cellHeight;})
	.attr("width",  function(d){return 1*cellWidth;})
	.attr("height",  function(d){return 1*cellWidth;})
	.attr("xlink:href", function(d){return urlstairs;});
//////////**********
}

function addDynamicAgents(){
	// determine how many residents have escaped from each floor
	// if have reached 20, will stop generating from that floor
	var emptyfloors = numpeople.filter(function(d){return d.state == SPACE;});
	console.log(emptyfloors)
	// First see if a resident arrives in this sim step.
	if (emptyfloors.length != 0){
		if (Math.random() < probArrival) {
			// pick a floor from the list of not filled floors
			var chosenfloor = emptyfloors[Math.floor(Math.random() * emptyfloors.length)]
			var floorindex = emptyfloors.indexOf(chosenfloor)
			
			// update resident information
			var homerow = emptyfloors[floorindex].row
			var homecol = starthallcol-2
			var targetcol = starthallcol
			var newresident = {"id":1, "location": {"row": homerow, "col": homecol}, "target": {"row": homerow, "col": targetcol}, "state": INROOM, "timeAdimitted":0}
			residents.push(newresident);

			// update number of people in floor
			emptyfloors[floorindex].people--;
			if (emptyfloors[floorindex].people == 0){
				emptyfloors[floorindex].state = FULL;
			}		
		}
	}
}

function updateResident(residentIndex){
	//residentIndex is an index into the residents data array
	residentIndex = Number(residentIndex); //it seems residentIndex was coming in as a string
	var resident = residents[residentIndex];
	// get the current location of the resident
	var row = resident.location.row;
	var col = resident.location.col;
	var state = resident.state;
	
	// determine if resident has arrived at destination
	var hasArrived = (Math.abs(resident.target.row-row)+Math.abs(resident.target.col-col))==0;
	
	// used in untreated
	var emptyhall = waitingSpots.filter(function(d){return d.row == resident.location.row && d.state == EMPTY;});
	var nearestCol = Math.max.apply(Math, emptyhall.map(function(o) { return o.col; }));
	var nearestSpot = waitingSpots.find(waitingSpots => waitingSpots.row == resident.location.row && waitingSpots.col == nearestCol);
	var nearestIndex = waitingSpots.indexOf(nearestSpot);

	// used in waiting
	var emptystair = stairSpots.filter(function(d){return d.row == resident.location.row && d.state == EMPTY;});
	
	var currentSpot = waitingSpots.find(waitingSpots => waitingSpots.row == resident.location.row && waitingSpots.col == resident.target.col);
	var currentIndex = waitingSpots.indexOf(currentSpot);

	var currentStair = stairSpots.find(stairSpots => stairSpots.row == resident.location.row)
	var stairIndex = stairSpots.indexOf(currentStair)

	// used in intreatement
	var belowrow = resident.location.row + 1; //the row below the student's current row
	var belowstair = stairSpots.find(stairSpots => stairSpots.row == belowrow); //obtain the object of below row
	// console.log(belowstair)
	var belowIndex = stairSpots.indexOf(belowstair) //obtain the index of belowstair

	// Behavior of resident depends on his or her state
	switch(state){
		case INROOM: 
			if (hasArrived){
				// first choose the spot nearest to the stairs
				resident.timeAdmitted = currentTime;
				resident.state = WAITING;
				waitingSpots[nearestIndex].state = OCCUPIED;

				// then determine the spot the resident will move to in the hall
				// will always choose the spot that's free and nearest to the stairs
				//resident.target.row = resident.location.row;
				resident.target.col = nearestCol;

			}
		break;
		case WAITING:
			// will keep moving in the hall to the spot nearest to the stairs
			// once it's at the spot outside the stairs, will change to in treatment (will move down the stairs)
			if (resident.target.col == startstairscol-1){
				if (hasArrived){
					// only if the stairspot is empty then enter the stairs
					if (emptystair.length != 0){
						// update stair spot
						//var hallwayTime = currentTime-resident.timeAdimitted;
						stairSpots[stairIndex].state = OCCUPIED;

						// update hallway spot
						waitingSpots[currentIndex].state = EMPTY;
						resident.state = INSTAIRCASE;
						resident.target.col = startstairscol
					} 
					
				}
				
			} else {
				// only if the new free spot is in front of where the resident is now, then update
				if (nearestCol > resident.target.col) {
						waitingSpots[nearestIndex].state = OCCUPIED;
						waitingSpots[currentIndex].state = EMPTY;
						resident.target.col = nearestCol
					}
				}
		break;
		case INSTAIRCASE:
			// moving down the stairs
			if (hasArrived){
				// will keep moving down until the floor below them isnt free

				if (resident.location.row == arriveRow[arriveRow.length-1]){ //if student is on the lowest/first floor
					// update resident info
					resident.state = OUTSIDESTAIRCASE //it will leave the building
					resident.target.row = starthostelrow+numfloor+1 //by moving one row down to exit the red area
					resident.target.col = resident.location.col

					// update the staircase spot if stairSpot isn't 
					stairSpots[stairIndex].state = EMPTY;
				}
				
			// if not on last floor, will keep moving down until the floor below them isn't free?
				else {	
					while (belowstair.state == EMPTY) {
						//update resident info
						resident.target.row = resident.target.row+1;
						resident.target.col = resident.location.col;
						
						// update staircase spot
						stairSpots[belowIndex].state = OCCUPIED;
						stairSpots[stairIndex].state = EMPTY;

						if (belowstair == undefined) break;
					}
				}
			}
		break;
		case OUTSIDESTAIRCASE:
			if (hasArrived){
				resident.state = EXITING;
				resident.target.row = resident.location.row;
				resident.target.col = maxCols;
				// compute statistics for escaped resident
				var timeInClinic = currentTime - resident.timeAdmitted;
				var stats;
				stats = statistics[0];
				stats.cumulativeValue = stats.cumulativeValue+timeInClinic;
				stats.count = stats.count + 1;
				statistics[1].cumulativeValue = currentTime;
			}
		break;
		case EXITING:
			if (hasArrived){
				resident.state = ESCAPED;
			}
		break;
		default:
		break;
	}
	// set the destination row and column
	var targetRow = resident.target.row;
	var targetCol = resident.target.col;
	// compute the distance to the target destination
	var rowsToGo = targetRow - row;
	var colsToGo = targetCol - col;
	// set the speed
	var cellsPerStep = 1;
	// compute the cell to move to
	var newRow = row + Math.min(Math.abs(rowsToGo),cellsPerStep)*Math.sign(rowsToGo);
	var newCol = col + Math.min(Math.abs(colsToGo),cellsPerStep)*Math.sign(colsToGo);
	// update the location of the resident
	resident.location.row = newRow;
	resident.location.col = newCol;
	
}

function removeDynamicAgents(){
	// We need to remove residents who have been discharged. 
	//Select all svg elements of class "resident" and map it to the data list called residents
	var allresidents = surface.selectAll(".resident").data(residents);
	//Select all the svg groups of class "resident" whose state is EXITED
	var escapedresidents = allresidents.filter(function(d,i){return d.state==ESCAPED;});
	// Remove the svg groups of EXITED residents: they will disappear from the screen at this point
	escapedresidents.remove();
	
	// Remove the EXITED residents from the residents list using a filter command
	residents = residents.filter(function(d){return d.state!=ESCAPED;});
	// At this point the residents list should match the images on the screen one for one 
	// and no residents should have state EXITED
}


function updateDynamicAgents(){
	// loop over all the agents and update their states
	for (var residentIndex in residents){
		updateResident(residentIndex);
	}
	updateSurface();	
}

function simStep(){
	//This function is called by a timer; if running, it executes one simulation step 
	//The timing interval is set in the page initialization function near the top of this file
	if (isRunning){ //the isRunning variable is toggled by toggleSimStep
		// Increment current time (for computing statistics)
		currentTime++;
		// Sometimes new agents will be created in the following function
		addDynamicAgents();
		// In the next function we update each agent
		updateDynamicAgents();
		// Sometimes agents will be removed in the following function
		removeDynamicAgents();
	}
}
