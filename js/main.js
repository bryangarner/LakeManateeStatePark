//global variables for data layers
var parkBoundary,
	trails,
	campingSites,
	parkEntrances,
	pointsOfInterest,
	userSubmissions;
//global variable to hold the current location
var myLocation = null;
// global for custom controls
var submitControl;
//global variables for the feature groups
var trailFeaturesLayerGroup = L.featureGroup(),
	pointOfInterestLayerGroup = L.featureGroup(),
	campingSitesLayerGroup = L.featureGroup(),
	userSubmissionsLayerGroup = L.featureGroup();
//establish baselayers
var carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
	}),
	imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		attribution: 'Tiles &copy; Esri'
	});
//setup baselayers for layer control
var baseMaps = {
	"Streets": carto,
	"Satellite": imagery
};
//overlays to include in the layer list
var overlays = {
	"Trail Features": trailFeaturesLayerGroup,
	"Camping Sites": campingSitesLayerGroup,
	"Points of Interest": pointOfInterestLayerGroup,
	"Park Comments": userSubmissionsLayerGroup
};
//initialize map bounds
var southWest = L.latLng(27.499273, -82.372754),
	northEast = L.latLng(27.462875, -82.293932),
	bounds = L.latLngBounds(southWest, northEast);
//create map
var map = L.map('mapid', {
	center: [27.47743564870103, -82.33467578887941],
	maxBounds: bounds,
	zoom: 15,
	minZoom: 15,
	maxZoom: 18,
	layers: [carto, trailFeaturesLayerGroup, campingSitesLayerGroup, pointOfInterestLayerGroup, userSubmissionsLayerGroup],
	defaultExtentControl: true
});
//create user location control
var userLocation = L.control.locate({
	locateOptions: {
		enableHighAccuracy: true
	},
	position: 'topleft',
	icon: "fas fa-map-marker-alt",
	setView: false
}).addTo(map);
userLocation.start();
//create bookmarks control
var bookmarks = new L.Control.Bookmarks({
	position: 'topleft'
}).addTo(map);
var toggleSubmitControlButton = L.easyButton({
	states: [{
		stateName: 'closed',
		icon: 'fas fa-user-edit',
		title: 'Submit a comment',
		onClick: function(btn, map) {
			btn.state('open');
			submitControl = L.control.submitControl({
				position: 'topleft'
			}).addTo(map);
			try {
				if (map.getBounds().contains(myLocation)) {
					$('#currentLocationButton').attr("disabled", false);
				}
			} catch (e) {}
		}
	}, {
		stateName: 'open',
		icon: 'fas fa-user-edit',
		title: 'Close comment submission box',
		onClick: function(btn, map) {
			map.removeControl(submitControl);
			btn.state('closed');
			drawnItems.eachLayer(function(layer) {
				map.removeLayer(layer)
			});
		}
	}]
}).addTo(map);
//custom control for inputs
L.Control.submitControl = L.Control.extend({
	onAdd: function(map) {
		var content = L.DomUtil.create('div', 'submit-Control');
		content.innerHTML = '<form onInput = checkForRequiredFields();><input id="currentLocationButton" class="btn" type="button" src="js/main.js" onclick="addPointAtCurrentLocation();" value="Use Current Location" disabled><input id="clickPointButton" class="btn" type="button" onclick="drawPoint();" value="Click a Point"><br><div id="fieldLabel"><label>Username:</label></div><input type="text" id="username"><div id="fieldLabel"><label>Latitude:</label></div><input type="text" id="latitude" disabled><div id="fieldLabel"><label>Longitude:</label></div><input type="text" id="longitude" disabled><div id="fieldLabel"><label>Category:</label></div><select id="categoryDropdown"><option value="default"></option><option value="Wildlife Sighting">Wildlife Sighting</option><option value="Trail Advisory">Trail Advisory</option> <option value="Photogenic Spot">Photogenic Spot</option></select><br><br><textarea id="userComment" rows="4" cols="29" name="comment" placeholder="Comments..."></textarea><br><br><input id="submitButton" class="btn" type="button" value="Submit" onclick="setData();" disabled><input id="resetButton" class="btn" type="reset" value="Reset" onclick="cancelData();"></form>';
		$(content).on('mouseover dblclick', function() {
			L.DomEvent.disableClickPropagation(content);
		});
		return content;
	}
});
L.control.submitControl = function(opts) {
	return new L.Control.submitControl(opts);
}
L.control.tagFilterButton({
	data: ['Wildlife Sighting', 'Trail Advisory', 'Photogenic Spot'],
	icon: 'fa fa-comments',
	filterOnEveryClick: true,
	clearText: "<strong><i>Clear Filter<i><strong>"
}).addTo(map);
var layerList = L.control.layers(baseMaps, overlays, {
	autoZIndex: true
}).addTo(map);
//global variable for the CARTO username
var cartoUserName = "bgarner";
//global variables for the CARTO database queries
//SQL queries to get all features from each layer
var sqlQueryParkBoundary = "SELECT * FROM park_boundary",
	sqlQueryTrails = "SELECT * FROM park_trails",
	sqlQueryCampingSites = "SELECT * FROM park_camping_sites",
	sqlQueryParkEntrances = "SELECT * FROM park_entrances",
	sqlQueryPointsOfInterest = "SELECT * FROM park_points_of_interest",
	sqlQueryUserSubmissions = "SELECT * FROM user_submission";
//function to load the park boundary onto the map
function loadParkBoundary() {
	$.getJSON("https://" + cartoUserName + ".carto.com/api/v2/sql?format=GeoJSON&q=" + sqlQueryParkBoundary, function(data) {
		parkBoundary = L.geoJson(data, {
			style: function(feature) {
				return {
					color: '#5c8944',
					weight: 1.5,
					opacity: 1,
					fillOpacity: 0.25,
					fillColor: '#bbe1a4'
				};
			}
		}).addTo(map);
		//bring the layer to the back of the layer order
		parkBoundary.bringToBack();
	});
}
loadParkBoundary();
//function to load the park trails onto the map
function loadTrails() {
	$.getJSON("https://" + cartoUserName + ".carto.com/api/v2/sql?format=GeoJSON&q=" + sqlQueryTrails, function(data) {
		trails = L.geoJson(data, {
			style: function(feature) {
				return {
					color: 'black',
					weight: 1.5,
					opacity: 1,
				};
			},
			onEachFeature: function(feature, layer) {
				//get the length and round to 2 decimal places
				var length = parseFloat(feature.properties.length_mi).toFixed(2).toLocaleString();
				layer.bindPopup(feature.properties.name + " (" + feature.properties.surface.toLowerCase() + ", " + length + " mi)" + "<br>Use: " + feature.properties.use + "<br>Accessibility: " + feature.properties.accessibility);
			}
		}).addTo(trailFeaturesLayerGroup);
		//bring the layer to the back of the layer order
		trails.bringToFront();
		//initial setup of almostover (a plugin allowing trails to be clicked easier on mobile)
		map.almostOver.addLayer(trailFeaturesLayerGroup);
	});
}
loadTrails();
//add circle to routes and setup popup location on routes for mouse over and click
var circle = L.circleMarker([0, 0], {
	radius: 5,
	fillColor: 'white',
	fillOpacity: 1
});
map.on('almost:over', function(e) {
	if (map.hasLayer(trailFeaturesLayerGroup)) {
		map.addLayer(circle);
	}
});
map.on('almost:move', function(e) {
	if (map.hasLayer(trailFeaturesLayerGroup)) {
		circle.setLatLng(e.latlng);
	}
});
map.on('almost:click', function(e) {
	if (map.hasLayer(trailFeaturesLayerGroup)) {
		var popup = e.layer.getPopup();
		popup.setLatLng(e.latlng).openOn(map);
	}
});
map.on('almost:out', function(e) {
	if (map.hasLayer(trailFeaturesLayerGroup)) {
		map.removeLayer(circle);
	}
});
//function to load the camping sites onto the map
function loadCampingSites() {
	$.getJSON("https://" + cartoUserName + ".carto.com/api/v2/sql?format=GeoJSON&q=" + sqlQueryCampingSites, function(data) {
		campingSites = L.geoJson(data, {
			pointToLayer: function(feature, latlng) {
				return L.circleMarker(latlng, {
					fillColor: '#5d0000',
					fillOpacity: 1,
					color: '#ffffff',
					weight: 0.25,
					opacity: 1,
					radius: 2.5
				});
			},
			onEachFeature: function(feature, layer) {
				layer.bindPopup("Site Id: " + feature.properties.site_id + "<br>Type: " + feature.properties.type + "<br> Electric Service: " + feature.properties.electric_service + "<br> Accessibility: " + feature.properties.accessibility + "<br> Surface Type: " + feature.properties.surface + "<br>Reservable: " + feature.properties.reservable + "<br>Site Acess: " + feature.properties.site_access + "<br>Sewer Service: " + feature.properties.sewer_service + "<br>Picnic Tables " + feature.properties.picnic_tables + "<br>Grill: " + feature.properties.grill + "<br>Firepit: " + feature.properties.fire_pit);
			}
		}).addTo(campingSitesLayerGroup);
		campingSites.bringToFront();
	});
}
loadCampingSites();
//function to load the park entrances
function loadParkEntrances() {
	$.getJSON("https://" + cartoUserName + ".carto.com/api/v2/sql?format=GeoJSON&q=" + sqlQueryParkEntrances, function(data) {
		parkEntrances = L.geoJson(data, {
			pointToLayer: function(feature, latlng) {
				//get the feature category to use to set its icon
				var featureName = feature.properties.type;
				//set icon based on the feature category
				return L.marker(latlng, {
					icon: getIcon(featureName)
				});
			},
			onEachFeature: function(feature, layer) {
				layer.bindPopup(feature.properties.type);
			}
		}).addTo(map);
		parkEntrances.bringToFront();
	});
}
loadParkEntrances();
//function to load the points of interest onto the map
function loadPointsOfInterest(sqlQueryFilteredPointsOfInterest) {
	$.getJSON("https://" + cartoUserName + ".carto.com/api/v2/sql?format=GeoJSON&q=" + sqlQueryPointsOfInterest, function(data) {
		pointsOfInterest = L.geoJson(data, {
			pointToLayer: function(feature, latlng) {
				//get the feature category to use to set its icon
				var featureName = feature.properties.name;
				//set icon based on the feature category
				return L.marker(latlng, {
					icon: getIcon(featureName)
				});
			},
			onEachFeature: function(feature, layer) {
				layer.bindPopup(feature.properties.name);
			}
		}).addTo(pointOfInterestLayerGroup);
	});
}
loadPointsOfInterest();
//function to load user submissions onto the map
function loadUserSubmissions() {
	//if the layer is already shown on the map, remove it
	if (map.hasLayer(userSubmissions)) {
		map.removeLayer(userSubmissions);
	}
	$.getJSON("https://" + cartoUserName + ".carto.com/api/v2/sql?format=GeoJSON&q=" + sqlQueryUserSubmissions, function(data) {
		userSubmissions = L.geoJson(data, {
			pointToLayer: function(feature, latlng) {
				//get the feature category to use to set its icon
				var featureType = feature.properties.category;
				///set icon based on the feature category
				return L.marker(latlng, {
					icon: getIcon(featureType),
					tags: [featureType]
				});
			},
			onEachFeature: function(feature, layer) {
				layer.bindPopup("Username: " + feature.properties.username + "<br>Category: " + feature.properties.category + "<br>Comment: " + feature.properties.comment);
			}
		}).addTo(userSubmissionsLayerGroup);
		userSubmissions.bringToFront();
	});
}
loadUserSubmissions();
//function to set icon based on category name
function getIcon(nameIn) {
	switch (nameIn) {
		case "Main Entrance":
			return L.icon({
				iconUrl: "icons/mainentrance.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Secondary Entrance":
			return L.icon({
				iconUrl: "icons/secondaryentrance.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Playground":
			return L.icon({
				iconUrl: "icons/playground.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Picnic Area":
			return L.icon({
				iconUrl: "icons/picnicarea.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Boat Ramp":
			return L.icon({
				iconUrl: "icons/boatramp.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Parking":
			return L.icon({
				iconUrl: "icons/parking.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Swimming Area":
			return L.icon({
				iconUrl: "icons/swimmingarea.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Camping (Full-Facility)":
			return L.icon({
				iconUrl: "icons/campingfullfacility.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Ranger Station":
			return L.icon({
				iconUrl: "icons/rangerstation.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Bathhouse":
			return L.icon({
				iconUrl: "icons/bathhouse.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Picnic Pavilion":
			return L.icon({
				iconUrl: "icons/picnicpavilion.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Loop #1 Bath House":
			return L.icon({
				iconUrl: "icons/bathhouse.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Loop #2 Bath House":
			return L.icon({
				iconUrl: "icons/bathhouse.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Boating":
			return L.icon({
				iconUrl: "icons/boating.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Hiking/Equestrian Trail":
			return L.icon({
				iconUrl: "icons/hikingequestriantrail.png",
				iconSize: [48, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Nature/Interpretive Trail":
			return L.icon({
				iconUrl: "icons/natureinterpretivetrail.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Canoeing/Kayaking":
			return L.icon({
				iconUrl: "icons/canoeingkyaking.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Canoe/Kayak Launch":
			return L.icon({
				iconUrl: "icons/canoekyaklaunch.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Geo-Seeking":
			return L.icon({
				iconUrl: "icons/geo-seeking.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Wildlife Viewing":
			return L.icon({
				iconUrl: "icons/wildlifeviewing.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Fishing":
			return L.icon({
				iconUrl: "icons/fishing.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Hiking Trail":
			return L.icon({
				iconUrl: "icons/hikingtrail.png",
				iconSize: [24, 24],
				popupAnchor: [0, -10]
			});
			break;
		case "Wildlife Sighting":
			return L.icon({
				iconUrl: "icons/wildlifesighting.png",
				iconSize: [25, 20],
				popupAnchor: [0, -10]
			});
			break;
		case "Trail Advisory":
			return L.icon({
				iconUrl: "icons/trailadvisory.png",
				iconSize: [25, 20],
				popupAnchor: [0, -10]
			});
			break;
		case "Photogenic Spot":
			return L.icon({
				iconUrl: "icons/photospot.png",
				iconSize: [25, 20],
				popupAnchor: [0, -10]
			});
			break;
		default:
			console.log("Item not found.")
			break;
	}
}
//create variable for Leaflet.draw features
var drawnItems = new L.FeatureGroup();
//create Leaflet Draw Control for the draw tool
var drawControl = new L.Control.Draw({
	draw: {
		polygon: false,
		polyline: false,
		rectangle: false,
		circle: false,
		marker: false
	},
	edit: false,
	remove: false
}).addTo(map);
var pointDrawer = new L.Draw.Marker(map);
//click handler for you button to start drawing point
function drawPoint() {
	drawnItems.clearLayers()
	pointDrawer.enable();
}
//function to run when feature is drawn on map
map.on('draw:created', function(e) {
	var layer = e.layer;
	//get latitude and longitude
	var latitude = layer.getLatLng().lat;
	var longitude = layer.getLatLng().lng;
	drawnItems.addLayer(layer);
	map.addLayer(drawnItems);
	//populate the latitude and longitude textboxes with the coordinates of the clicked point
	$('#latitude').val(latitude);
	$('#longitude').val(longitude);
	//check to make sure all fields are populated with the necessary information
	checkForRequiredFields();
});

function onLocationFound(e) {
	//set global var for location
	myLocation = e.latlng;
	//if the current location is outside map bounds, do not allow user to use current location
	if (map.getBounds().contains(myLocation)) {
		$('#currentLocationButton').attr("disabled", false);
	}
}
map.on('locationfound', onLocationFound);
//function to run when the Current Location button is clicked
function addPointAtCurrentLocation() {
	drawnItems.eachLayer(function(layer) {
		map.removeLayer(layer)
	});
	//get latitude and longitude
	var latitude = myLocation.lat;
	var longitude = myLocation.lng;
	//populate the latitude and longitude textboxes with the coordinates of the current location
	$('#latitude').val(latitude);
	$('#longitude').val(longitude);
	drawnItems = new L.FeatureGroup();
	var layer = L.marker(myLocation);
	//add the new layer to the drawnItems feature group
	drawnItems.addLayer(layer);
	//add the drawnItems feature group to the map
	map.addLayer(drawnItems);
	//check to make sure all fields are populated with the necessary information
	checkForRequiredFields();
}
//submit data to the PHP using a jQuery Post method
var submitToProxy = function(q) {
	$.post("php/callProxy.php", { // <--- Enter the path to your callProxy.php file here
		qurl: q,
		cache: false,
		timeStamp: new Date().getTime()
	}, function(data) {
		refreshLayer();
	});
};
//refresh the layers to show the updated dataset
function refreshLayer() {
	loadUserSubmissions();
};

function setData() {
	var userName = $("#username").val().replace(/["']/g, "");
	var category = $("#categoryDropdown").val();
	var userComment = $("#userComment").val().replace(/["']/g, "");
	drawnItems.eachLayer(function(layer) {
		var sql = "INSERT INTO user_submission (the_geom, username, comment, category) VALUES (ST_SetSRID(ST_GeomFromGeoJSON('";
		var a = layer.getLatLng();
		var sql2 = '{"type":"Point","coordinates":[' + a.lng + "," + a.lat + "]}'),4326),'" + userName + "','" + userComment + "','" + category + "')";
		var pURL = sql + sql2;
		submitToProxy(pURL);
	});
	map.removeLayer(drawnItems);
	drawnItems = new L.FeatureGroup();
	$('#username').val("");
	$('#latitude').val("");
	$('#longitude').val("");
	$('#categoryDropdown').val('default').attr('selected');
	$('#userComment').val("");
	$('#submitButton').attr("disabled", true);
};
//function to cancel the newly drawn points
function cancelData() {
	// Remove the drawnItems layer from the map
	map.removeLayer(drawnItems);
	//create a new empty drawnItems feature group
	drawnItems = new L.FeatureGroup();
	$('#submitButton').attr("disabled", true);
}
//function to check for required fields
function checkForRequiredFields() {
	var latitude = $('#latitude').val();
	var longitude = $('#longitude').val();
	var username = $('#username').val();
	var usercomment = $('#userComment').val();
	var category = $('#categoryDropdown').val();
	if (latitude !== "" && longitude !== "" && username !== "" && usercomment !== "" && category !== "default") {
		//enable the Submit button
		$('#submitButton').attr("disabled", false);
	} else {
		//disable the Submit button
		$('#submitButton').attr("disabled", true);
	}
}