var isLoaded = false;
var error = false;
var availableDevices = []


var selectedDevice = null;
var selectedColumns = ["date", "temperature", "gravity" ];

var selectedInterval = null;
var availableIntervals = [];
var selectedColumnsStr = "date,temperature,gravity";
var chartData = []
var chart = {};

function parseHash() {
	if (!window.location.hash) {
		return;
	}


	var hash = window.location.hash;

	hash = decodeURI(hash.substring(1));

	const hashObj = JSON.parse(hash);
	console.log("parsing hash: "+hash);

	if (hashObj.device) {
		console.log("hash contains device: "+hashObj.device);
		console.log("availableDevices: "+availableDevices);
		for (const dev of availableDevices) {
			console.log("available device: "+dev+", searching for: "+hashObj.device );
			if (dev.name == hashObj.device) {
				selectedDevice = dev;
				document.getElementById("deviceSelect").value = dev.name;

				updateDevice();
				break;
			}
		}
	}

	if (hashObj.interval) {
		console.log("hash contains interval: "+hashObj.interval);
		selectedInterval = hashObj.interval;
		updateInterval();
	}

	if (hashObj.columns) {
		console.log("hash contains columns: "+hashObj.columns);
		selectedColumns = hashObj.columns;
		selectedColumnsStr = "";
		for (const colElem of document.getElementsByName("column")) {
			if (selectedColumns.includes(colElem.value)) {
				colElem.checked = true;
				selectedColumnsStr += colElem.value + ","
			} else {
				colElem.checked = false;
			}
		}
		selectedColumnsStr = selectedColumnsStr.slice(0, -1);
		columnUpdated();
		reloadChart();
	}

}

function generateHash() {
	var hashObj = {};
	hashObj.device = selectedDevice.name;
	hashObj.interval = selectedInterval;
	hashObj.columns = selectedColumns;

	const hashStr = JSON.stringify(hashObj);
	window.location.hash = hashStr;
}


function deviceSelected() {
	var select = document.getElementById("deviceSelect");
	var selectedName = select.options[select.selectedIndex].text;

	for (const dev of availableDevices) {
		if (dev.name == selectedName) {
			selectedDevice = dev;
			break;
		}
	}
	selectedInterval = null;
	updateDevice();
	generateHash();

}

function intervalSelected() {
	var select = document.getElementById("intervalSelect");
	var selectedName = select.options[select.selectedIndex].value;
	
	selectedInterval = availableIntervals[selectedName];
	updateInterval();
	generateHash();
}

async function listDevices() {
	await fetch("/cgi-bin/ispindel/listDevices.py")
		.then(res => res.json())
		.then(
			(result) => {
				isLoaded = true;
				data = result;
				error = undefined;
			},
			(commError) => {
				isLoaded = true;
				data = undefined;
				error = commError;
			}
		);


	if (error) {
		return;
	}
	if (data == availableDevices) {
		return;
	}
	availableDevices = data;

	var str = ""
	str += "<option name=\"\">[Select device]</option>";
	var lastDev = "";
	for (const dev of data) {
		str += "<option name=\"" + dev.name + "\">" + dev.name + "</option>";
		lastDev = dev.name;
	}
	
	document.getElementById("deviceSelect").innerHTML = str;
	document.getElementById("deviceSelect").disabled = false;

	if (data.length == 1) {
		document.getElementById("deviceSelect").value = lastDev;
		selectedDevice = availableDevices[0];
		updateDevice();
	}
}


async function listIntervals() {
	await fetch("/cgi-bin/ispindel/listIntervals.py?device="+selectedDevice.name)
		.then(res => res.json())
		.then(
			(result) => {
				isLoaded = true;
				data = result;
				error = undefined;
			},
			(commError) => {
				isLoaded = true;
				data = undefined;
				error = commError;
			}
		);


	if (error) {
		return;
	}
	if (data == availableIntervals) {
		return;
	}
	availableIntervals = data;

	var str = ""
	str += "<option value=\"\">[Select interval]</option>";
//	str += "<option value=\"-1\">[Everything]</option>";
	var i = 0;

	var foundSelected = undefined;

	for (const intvl of data) {
		var selected = "";
		if (selectedInterval && selectedInterval.start == intvl.start && selectedInterval.end == intvl.end) {
			foundSelected = i;
		}
		
		str += "<option value=\"" + i + "\">" + (intvl.start != undefined ? intvl.start : "???") + " - " + (intvl.end != undefined ? intvl.end : "???")+ "</option>";
		i += 1;
	}
	if (selectedInterval && foundSelected == undefined) {
		str += "<option value=\"" + i + "\"d>" + (selectedInterval.start != undefined ? selectedInterval.start : "???") + " - " + (selectedInterval.end != undefined ? selectedInterval.end : "???")+ "</option>";
		foundSelected = i;
		i += 1;
	}


	document.getElementById("intervalSelect").innerHTML = str;
	document.getElementById("intervalSelect").disabled = false;

	if (selectedInterval) {
		document.getElementById("intervalSelect").value = foundSelected;
	} else {
		document.getElementById("intervalSelect").value = i-1;
	}
	
	intervalSelected();
}

async function getChartData() {
	if (!selectedDevice) {
		console.log("Attempt to update chart data with no device selected!");
		return;
	}
	var url = "/cgi-bin/ispindel/getData.py?device="+selectedDevice.name+"&columns="+selectedColumnsStr;
	
	if (selectedInterval != undefined && selectedInterval.start != undefined) {
		url += "&since="+selectedInterval.start;
	}

	if (selectedInterval != undefined && selectedInterval.end != undefined) {
		url += "&until="+selectedInterval.end;
	}

	await fetch(url)
		.then(res => res.json())
		.then(
			(result) => {
				isLoaded = true;
				data = result;
				error = undefined;
			},
			(commError) => {
				isLoaded = true;
				data = undefined;
				error = commError;
			}
		);


	if (error) {
		return;
	}

	if (typeof chart.destroy === "function") {
		chart.destroy();
	}

	var chartLabels = [];
	var chartData = {};
	var chartDates = [];
	var chartDataObjs = [];

	for (const line of data) {
		for (const col of selectedColumns) {
			if (col == "date") {
				continue;
			}

			var chartDataObj = {};

			if (typeof chartData[col] == 'undefined') {
				chartData[col] = [line[col]];
				chartDataObjs[col] = [];
			} else {
				chartData[col].push(line[col]);
			}

			chartDataObj.x = Date.parse(line["date"]);
			chartDataObj.y = line[col];
			chartDataObjs[col].push(chartDataObj);
		}

		chartLabels.push(line["date"]);
		chartDates.push(Date.parse(line["date"]));
	}

	var datasets = [];
	var yAxes = {};
	var i = 0;
	var backgrounds = [ "red", "blue", "green", "pink" ];
	var xAxis = {};
	xAxis.type = "time";
	yAxes["x"] = xAxis;
	for (const col of selectedColumns) {
		if (col == "date") {
			continue;
		}
		var dataset = {};
		dataset.label = col;
		dataset.yAxisID = col;
		dataset.data = [];
		dataset.data = chartDataObjs[col];
		dataset.backgroundColor = backgrounds[i];
		datasets.push(dataset);

		var yAxis = {};
//		yAxis.id = col;
		yAxis.type = "linear";
		yAxis.position = (i % 2 == 1 ? "left" : "right");
//		yAxes.push(yAxis);
		yAxes[col] = yAxis;
		i += 1;
	}



	const ctx = document.getElementById('spindelChart').getContext('2d');
	chart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: chartLabels,
			datasets: datasets,
		},
		options: {
//			scales: yAxes
			scales: {
				x: {
					type: "time",
					time: {
						displayFormats: {
							hour: "yyyy-MM-dd hh:mm"
						},
						unit: 'hour'
					}
				},
/*				y: {
				    title: {
        				 display: true,
			        	  text: 'value'
				        }		
				}*/

			}
		}
	});


}



function updateInterval() {
	reloadChart();
}

function updateDevice() {
	var str = "";
	
	for (const col of selectedDevice.reported_data) {
		if (col == "date" || col == "name" || col == "ID") {
			continue;
		}
		str += "<input type=\"checkbox\" onchange=\"columnUpdated();\" name=\"column\" value=\"" + col + "\" "+ ((col == "gravity" || col == "temperature") ? "checked" : "" ) + "/> " + col + " | ";

	}
	document.getElementById("columns_checkbox").innerHTML = str;
	listIntervals();
}

function columnUpdated() {
	var cols = document.querySelectorAll('input[name="column"]:checked');

	var selCols = ["date" ]
	selectedColumnsStr = "date,";
	for (const col of cols) {
		selCols.push(col.value);
		selectedColumnsStr += col.value+",";
	}
	selectedColumnsStr = selectedColumnsStr.slice(0, -1);
	selectedColumns = selCols;

	if (selectedInterval == null) {
		return;
	}

	reloadChart();
	generateHash();
}

function reloadChart() {
	getChartData();
}

window.onload = async function() {
	await listDevices();
	parseHash();
}

