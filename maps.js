var map, veterinarias, geocoder, infoWindow, distanceMatrixService, userMarker,
  directionsDisplay, directionsService, autocomplete, findMarker;
var markers = [];

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: {
      lat: -33.437575,
      lng: -70.650490
    },
    zoom: 12
  });
  map.mapTypes.set('styled_map', new google.maps.StyledMapType(styledMapTypeJson));
  map.setMapTypeId('styled_map');
  geocoder = new google.maps.Geocoder();
  distanceMatrixService = new google.maps.DistanceMatrixService;
  directionsDisplay = new google.maps.DirectionsRenderer;
  directionsService = new google.maps.DirectionsService;
  loadUserPosition();
  autocomplete = new google.maps.places.Autocomplete(document.getElementById('autocomplete'), {
    types: ['geocode']
  });

  autocomplete.addListener('place_changed', fillInAddress);
}

function loadUserPosition() {
  infoWindow = new google.maps.InfoWindow;
  var im = 'http://www.robotwoods.com/dev/misc/bluecircle.png';
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      var myLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      userMarker = new google.maps.Marker({
        position: myLatLng,
        map: map,
        icon: im
      });
      map.setCenter(myLatLng);
      var circle = new google.maps.Circle({
        center: myLatLng,
        radius: position.coords.accuracy
      });
      autocomplete.setBounds(circle.getBounds());
    }, function () {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
    'Error: The Geolocation service failed.' :
    'Error: Your browser doesn\'t support geolocation.');
  infoWindow.open(map);
}

function loadVeterinaries() {
  veterinarias = data;
  if (markers.length != veterinarias.length) {
    markers = [];
    for (var i = 0; i < veterinarias.length; i++) {
      codeAddress(veterinarias[i].address);
    }
  } else {
    loadMarkersOnMap(markers.length);
  }
}

function codeAddress(address) {
  geocoder.geocode({
    'address': address
  }, function (results, status) {
    if (status === 'OK') {
      var marker = new google.maps.Marker({
        position: results[0].geometry.location,
        map: map
      });
      var infowindow = new google.maps.InfoWindow({
        content: results[0].formatted_address
      });

      marker.addListener('click', function () {
        infowindow.open(marker.get('map'), marker);
        directionToVet(userMarker.position, marker.position);
      });
      marker.distanceToUser = getDistanceFromLatLonInKm(userMarker.getPosition().lat(), userMarker.getPosition().lng(), marker.getPosition().lat(), marker.getPosition().lng());
      markers.push(marker);
    } else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
      setTimeout(function () {
        codeAddress(address);
      }, 100);
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}

function loadMarkersOnMap(index) {
  for (var i = 0; i < index; i++) {
    markers[i].setMap(map);
  }
}

function clearMarkers() {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(null);
  }
  if (findMarker != null) {
    findMarker.setMap(null);
  }
  clearDistanceMatrix();
  clearDirectionDisplay();
  map.setCenter(userMarker.position);
  goToTab("tab-distance-matrix");  
}

function goToTab(id){
  $("#"+id).trigger('click');
}

function clearDistanceMatrix() {
  $(".list-group").empty();
}

function clearDirectionDisplay() {
  directionsDisplay.setMap(null);
  $("#directions").empty();
}

function loadNearestVeterinaries() {
  markers.sort(function (a, b) {
    return a.distanceToUser - b.distanceToUser
  });
  clearMarkers();
  loadMarkersOnMap(10);
  displayDistanceMatrix(10);
}

function displayDistanceMatrix(index) {
  distanceMatrixService.getDistanceMatrix({
    origins: [userMarker.position],
    destinations: getMarkersPositions(index),
    travelMode: 'DRIVING',
    unitSystem: google.maps.UnitSystem.METRIC,
    avoidHighways: false,
    avoidTolls: false
  }, function (response, status) {
    if (status !== 'OK') {
      alert('Error was: ' + status);
    } else {
      for (var i = 0; i < response.destinationAddresses.length; i++) {
        $(".list-group").append("<li class='list-group-item li-custom'><b>From</b> " +
          response.originAddresses[0] +
          "<br/><b>to</b> " + response.destinationAddresses[i] +
          "<br/><b>" + response.rows[0].elements[i].distance.text + "</b> in <b>" + response.rows[0].elements[i].duration.text + "</b></li>");
      }
    }
  });
}

function directionToVet(start, end) {
  directionsDisplay.setMap(map);
  directionsDisplay.setPanel(document.getElementById('directions'));
  directionsService.route({
    origin: start,
    destination: end,
    travelMode: 'DRIVING'
  }, function (response, status) {
    if (status === 'OK') {
      directionsDisplay.setDirections(response);
      goToTab("tab-directions");
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}

function getMarkersPositions(index) {
  var result = [];
  for (var i = 0; i < index; i++) {
    result.push(markers[i].position);
  }
  return result;
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

function fillInAddress() {
  var place = autocomplete.getPlace();
  geocoder.geocode({
    'address': place.formatted_address
  }, function (results, status) {
    if (status === 'OK') {
      var img = "http://maps.google.com/mapfiles/ms/icons/blue.png";
      findMarker = new google.maps.Marker({
        position: results[0].geometry.location,
        map: map,
        icon: img
      });
      var infowindow = new google.maps.InfoWindow({
        content: results[0].formatted_address
      });
      map.setCenter(findMarker.position);
      findMarker.addListener('click', function () {
        infowindow.open(findMarker.get('map'), findMarker);
        directionToVet(userMarker.position, findMarker.position);
      });
      findMarker.distanceToUser = getDistanceFromLatLonInKm(userMarker.getPosition().lat(), userMarker.getPosition().lng(), findMarker.getPosition().lat(), findMarker.getPosition().lng());
    } else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
      setTimeout(function () {
        codeAddress(address);
      }, 100);
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}