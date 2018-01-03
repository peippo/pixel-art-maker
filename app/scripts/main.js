/*jshint esversion: 6 */

// DOM elements
const gridTable = $('#grid-table');
const gridRowsInput = $('#input-rows');
const gridColsInput = $('#input-cols');
const gridInputs = $(gridRowsInput).add($(gridColsInput));
const rowsNumberElement = $('.rows-number');
const colsNumberElement = $('.cols-number');
const saveDrawingButton = $('#save-drawing');
const loadDrawingButton = $('#load-drawing');
const clearGridButton = $('#clear-grid');

// Grid size holders
let gridRows; // height
let gridCols; // width

// Drawing information holders
let rowArray = [];
let drawingArray = [];
let drawingsFromDatabase = [];
let randomDrawingFromDatabase;

// Track grid cell clicks to disable saving while the grid is empty
let cellsClicked = 0;

$(function() {
	$(gridInputs).on('change', function() {
		updateGridSize();

		// When changing grid size, if something has already been drawn, update grid from drawing array, otherwise make a new grid
		if (drawingArray.length) {
			updateDrawingToGridFromArray(gridRows, gridCols, drawingArray);
		} else {
			makeGrid(gridRows, gridCols);
		}
	});

	loadDrawingButton.on('click', function() {
		randomFromDatabaseCollection();
		enableClear();
	});

	saveDrawingButton.on('click', function() {
		saveToDatabase(drawingArray);
		disableSaving();
		saveDrawingButton.html('<i class="fa fa-check"></i><span class="mobile-legend">Saved!</span><span class="legend"> Saved!</span>');
		cellsClicked = 0;
	});

	clearGridButton.on('click', function() {
		clearGrid();
		drawingArray = [];
		disableSaving();
		disableClear();
		cellsClicked = 0;
	});

	updateGridSize();
	makeGrid(gridRows, gridCols);
	pullDataFromDatabase();
});


function enableSaving() {
	document.getElementById('save-drawing').disabled = false;
	saveDrawingButton.removeClass('disabled');
	saveDrawingButton.html('<i class="fa fa-cloud-upload"></i><span class="mobile-legend">Save</span><span class="legend"> Save to cloud</span>');
}

function disableSaving() {
	document.getElementById('save-drawing').disabled = true;
	saveDrawingButton.addClass('disabled');
}

function enableClear() {
	document.getElementById('clear-grid').disabled = false;
	clearGridButton.removeClass('disabled');
}

function disableClear() {
	document.getElementById('clear-grid').disabled = true;
	clearGridButton.addClass('disabled');
}

function saveToDatabase(array) {
	// Update drawing array to make sure we get the right sized grid (grid size might have been changed after last edit)
	updateDrawingArray();

	let timestamp = new Date().getTime();

	firebase.database().ref('drawings/' + timestamp).set({
		array: array
	});

	pullDataFromDatabase();
}

function pullDataFromDatabase() {
	const drawingsRef = database.ref('drawings');

	drawingsRef.on('value', function(snapshot) {
		snapshot.forEach(function(childSnapshot) {
			let childData = childSnapshot.val();
			drawingsFromDatabase.push(childData);
		});
	});
}

function randomFromDatabaseCollection() {
	if (drawingsFromDatabase.length === 0) {
		pullDataFromDatabase();
	} else if (drawingsFromDatabase.length > 1) {
		randomDrawingFromDatabase = drawingsFromDatabase[Math.floor(Math.random() * drawingsFromDatabase.length)];

		// Convert array from Firebase to same format as our drawing array
		let rows = randomDrawingFromDatabase.array.length;
		let convertedArray = [];
		for (let i = 0; i < rows; i++) {
			convertedArray.push(randomDrawingFromDatabase.array[i]);
		}
		randomDrawingFromDatabase = convertedArray;

		// Check if we loaded the same drawing we are already displaying, if so, get a new one
		if (isEqual(drawingArray, randomDrawingFromDatabase)) {
			randomFromDatabaseCollection();
		} else {
			makeGridFromArray(randomDrawingFromDatabase);
		}
	}
}

// Sum all numbers in a multidimensional array
function sumArray(array) {
	var sum = 0;
	for (var i = 0; i < array.length; i++) {
		if (typeof array[i] == 'object')
			for (var j = 0; j < array[i].length; j++) {
				sum += parseInt(array[i][j]);
			}
		else
			sum += parseInt(array[i]);
		}
	return sum;
}

// Update grid size holders
function updateGridSize() {
	gridRows = gridRowsInput.val();
	gridCols = gridColsInput.val();
}

// Add CSS class to grid table containing the amount of columns (for adding styling that keeps the grid squares proportionally sized)
function updateGridTableClass(width) {
	gridTable.removeClass();
	gridTable.addClass('columns-' + width);
}

// Update numbers display and value of grid size input sliders
function updateInputNumbers(height, width) {
	rowsNumberElement.text(height);
	colsNumberElement.text(width);
	gridRowsInput.val(height);
	gridColsInput.val(width);
}

function clearGrid() {
	updateGridSize();
	makeGrid(gridRows, gridCols);
}

// Make a grid based on input values
function makeGrid(height, width) {
	updateInputNumbers(height, width);
	updateGridTableClass(width);

	let newTable = '';

	for (let rows = 0; rows < height; rows++) {
		newTable += '<tr data-row=' + rows +'>';

		for (let cols = 0; cols < width; cols++) {
			newTable += '<td data-col=' + cols +' data-color=0></td>';
		}

		newTable += '</tr>';
	}

	gridTable.html(newTable);
	addDrawEvents();
}

// Make a grid based on array information
function makeGridFromArray(array) {
	// Get grid height and width from array lengths
	let height = array.length;
	let width = array[0].length;
	let newTable = '';

	updateInputNumbers(height, width);
	updateGridTableClass(width);

	for (let rows = 0; rows < height; rows++) {
		newTable += '<tr data-row=' + rows +'>';

		for (let cols = 0; cols < width; cols++) {
			// Set current loop position array value to data-color attribute
			newTable += '<td data-col=' + cols +' data-color=' + array[rows][cols] + '></td>';
		}

		newTable += '</tr>';
	}

	gridTable.html(newTable);
	addDrawEvents();
	updateDrawingArray();
	addRandomGlitter();
	disableSaving();
}

function updateDrawingToGridFromArray(height, width, array) {
	let newTable = '';

	updateInputNumbers(height, width);
	updateGridTableClass(width);

	for (let rows = 0; rows < height; rows++) {
		newTable += '<tr data-row=' + rows +'>';

		for (let cols = 0; cols < width; cols++) {
			// Check to see if array contains a row and set table cell data-color attributes from that,
			// if not, create a empty cells with data-color set to 0
			if (array[rows]) {
				newTable += '<td data-col=' + cols +' data-color=' + array[rows][cols] + '></td>';
			} else {
				newTable += '<td data-col=' + cols +' data-color=0></td>';
			}
		}

		newTable += '</tr>';
	}

	gridTable.html(newTable);
	addDrawEvents();
}

function updateDrawingArray() {
	drawingArray = [];
	rowArray = [];

	// Loop through each table row
	$('tr').each(function() {
		// Loop through each table cell
		$(this).children('td').each(function() {
			// Get current cell color code, push color code to row array
			rowArray.push($(this).attr('data-color'));
		});

		// Push completed row array to drawing array, clear row array for next loop through
		drawingArray.push(rowArray);
		rowArray = [];
	});
}

// Get a random value between 1-9, add various glitter effects on values of 1-3
function randomizeGlitter(target) {
	let random = Math.floor(Math.random() * (10 - 1) + 1);
	switch (random) {
		case 1:
			target.addClass('glitter');
			break;
		case 2:
			target.addClass('glitter glitter-slow');
			break;
		case 3:
			target.addClass('glitter glitter-fast');
			break;
		default:
			break;
	}
}

// Add random glittering effect to grid cells
function addRandomGlitter() {
	$('td').each(function() {
		randomizeGlitter($(this));
	});
}

function addDrawEvents() {
	// Left click listener
	$('td').on('click', function(e) {
		e.preventDefault();
		// If the cell color attribute is set to 1, change it to 2
		if ($(this).attr('data-color') === '1') {
			$(this).attr('data-color', 2);
			$(this).removeClass();
		// If the cell color attribute is set to 2, change it to 0
		} else if ($(this).attr('data-color') === '2') {
			$(this).attr('data-color', 0);
		// If the cell color attribute is set to 0, change it to 1
		} else {
			$(this).attr('data-color', 1);
			randomizeGlitter($(this));
		}
	});

	// Right click listener
	$('td').on('contextmenu', function(e) {
		e.preventDefault();
		// If the cell color attribute is set to 1, change it to 2
		if ($(this).attr('data-color') === '1') {
			$(this).attr('data-color', 2);
			$(this).removeClass();
		// If the cell color attribute is set to 2, change it to 0
		} else if ($(this).attr('data-color') === '2') {
			$(this).attr('data-color', 0);
		// If the cell color attribute is set to 0, change it to 2
		} else {
			$(this).attr('data-color', 2);
		}
	});

	// Additional things for left & right clicks
	$('td').on('click contextmenu', function(e) {
		// Update drawing array and cells clicked holder when a cell is clicked
		updateDrawingArray();
		cellsClicked += 1;

		// Enable saving when enough cells have been clicked
		if (cellsClicked > 4) {
			enableSaving();
			cellsClicked = 0;
		}

		let drawingArraySum = sumArray(drawingArray);

		// Disable saving and clearing if the grid is empty
		if (drawingArraySum === 0) {
			disableSaving();
			disableClear();
			cellsClicked = 0;
		// Enable clearing when anything is on the grid, but keep saving disabled until there's a little bit more
		} else if (drawingArraySum < 4) {
			disableSaving();
			enableClear();
		} else {
			enableClear();
		}
	});
}

// Check if two arrays are equal, from:
// https://gomakethings.com/check-if-two-arrays-or-objects-are-equal-with-javascript/
var isEqual = function (value, other) {

	// Get the value type
	var type = Object.prototype.toString.call(value);

	// If the two objects are not the same type, return false
	if (type !== Object.prototype.toString.call(other)) return false;

	// If items are not an object or array, return false
	if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;

	// Compare the length of the length of the two items
	var valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
	var otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
	if (valueLen !== otherLen) return false;

	// Compare two items
	var compare = function (item1, item2) {

		// Get the object type
		var itemType = Object.prototype.toString.call(item1);

		// If an object or array, compare recursively
		if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
			if (!isEqual(item1, item2)) return false;
		}

		// Otherwise, do a simple comparison
		else {

			// If the two items are not the same type, return false
			if (itemType !== Object.prototype.toString.call(item2)) return false;

			// Else if it's a function, convert to a string and compare
			// Otherwise, just compare
			if (itemType === '[object Function]') {
				if (item1.toString() !== item2.toString()) return false;
			} else {
				if (item1 !== item2) return false;
			}

		}
	};

	// Compare properties
	if (type === '[object Array]') {
		for (var i = 0; i < valueLen; i++) {
			if (compare(value[i], other[i]) === false) return false;
		}
	} else {
		for (var key in value) {
			if (value.hasOwnProperty(key)) {
				if (compare(value[key], other[key]) === false) return false;
			}
		}
	}

	// If nothing failed, return true
	return true;
};