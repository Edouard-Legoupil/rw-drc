//  The site uses a page specific singleton to
//  limit scripts to executing on pages that are dependent on
//  existing DOM elements.
//
//  To create a new method write follow the pattern below by
//  writing something like `internews.PAGENAME = function() {};`
//
//  To trigger the code on a page simply run the function on page load.
//  You can execute the desired function from any layout: - _layouts/TEMPLATE.html or
//  specific page: - _posts/POST.html like so:
//
//      <script>
//          window.onload = function () {
//              RW.PAGENAME();
//          });
//      </script>
//
//  See the root `_includes/map-interactive.html` page as example.
(function(context) {
    var RW = RW || {};
    var year = year || '2012';

    RW.interactive = function() {

        var m, mm = com.modestmaps;
        var baseLayers = [
            'reliefweb.map-v4b1gazj',
			//'reliefweb.africa',
            //'reliefweb.drc-borders'
        ];
        
        var baseUrl = 'http://api.tiles.mapbox.com/v3/';
        // initializes the Layers object in `data.js`
        var layers = window.layers = new Layers();
        var initialized = false;
        // Default coordinates.
        var lat = -4, lng = 22, z = 5;
        // Parse the url hash if one exists.
        var h = document.location.hash.replace('#', '').split('&') || '';

        // Grab the coordinates if any exist in the hash on page load.
        // Pass these values into m.setCenterZoom method.
        if (h[0]) {
            var c = h[0].split(',');
            lat = parseFloat(c[0]);
            lng = parseFloat(c[1]);
            z   = parseFloat(c[2]);
        }
        // Before anything else grab any layers that show up in the
        // hash and build out the site based on what's there. If none
        // are to be found continue as normal.
        if (h[1]) {
            var l = h[1].replace('layers=', '').split(',');
            if (l !== '') {
                // Since layers are around in the url, drop the active classes
                $('ul.layers li').removeClass('active');
                _.each(l, function(v, k) {
                    var activeLink = 'a#' + v;
                    $(activeLink).parent().addClass('active');
                });
            }
            $('ul.layers li').each(function(i, el) {
                layers.active[$(el).find('a').attr('id')] = $(el).hasClass('active');
            });
        }
        
        

        // This function builds out our map. It gets requested when
        // a layer link has been triggered on our off or a timeline
        // slider has been moved around. See the wax docs for further
        // explanation: mapbox.com/wax
        var drawMap = function() {
         
            var om;

            if (RW._map) {
                // Clone map backgrounds for soft layer transitions.
                $('#map-bg').remove();
                $('#map').attr('id','map-bg').after('<div id="map"></div>');
            }
            var jObject = baseUrl + baseLayers.join(',') + (',reliefweb.') + layers.current(year)  + '.jsonp'
            wax.tilejson(jObject, function(tilejson) {
                tilejson.minzoom = 4;
                tilejson.maxzoom = 8;
                m = new mm.Map('map',
                    new wax.mm.connector(tilejson), null, [
                        new mm.MouseHandler(),
                        new mm.TouchHandler()
                    ]
                );

                if (RW._map) {
                    m.coordinate = RW._map.coordinate;
                    m.draw();
                    // Link panning and zooming for old and new maps.
                    om = RW._map;
                    m.addCallback('panned', function(m, coords) { om.panBy(coords[0], coords[1]); });
                    m.addCallback('zoomed', function(m, offset) { om.zoomBy(offset); });
                } else {
                    m.setCenterZoom(new mm.Location(lat,lng), z);
                }

                wax.mm.legend(m, tilejson).appendTo(m.parent);
                wax.mm.interaction(m, tilejson);

                // Used to capture the layer name to pass into the hash.
                var currentActiveLayers = function() {
                    var list = [];
                    $('li.active a').each(function () {
                        list.push($(this).attr('id'));
                    });
                    return list.join(',');
                }

                // After the map has been drawn alter the hash in the
                // url with our new center/lat/long and layers active.
                m.addCallback('drawn', function(modestmap, e) {
                    var hash = '#'
                        + m.getCenter()['lat']
                        + ',' + m.getCenter()['lon']
                        + ',' + m.getZoom()
                        + '&layers=' + currentActiveLayers();

                    document.location.hash = hash;
                });

                // Because we are cloning the map for a soft transition,
                // remove the .zoomer code from the dom and
                // re-implement it.
                $('.zoomer').remove();
                wax.mm.zoomer(m, tilejson).appendTo($('#controls')[0]);
                // Wax method to determine whether lower resolution
                // tiles should be served based on the request speed of
                // the users current connection.
                wax.mm.bwdetect(m, {
                    auto: true,
                    png: '.png64?'
                });
                // For cloning, assign this new RW._map as our map
                // object `m`
                RW._map = m;
            });
        }

        // This function gets called once on page load after
        // drag.animationCallback has stopped.
        var refreshOnce = _.debounce(function() {
            if (!initialized) {
                refreshAll(year);
            }
            initialized = true;
        }, 100);

        // This function builds out our table on the site and when
        // complete hands things off to the drawMap function.
        var refreshAll = function() {
            var tableData = {};
            var loaded = 0;
            // Based on the json request, construct the table based on
            // the data that is returned. This new object is called
            // tableData.
            var buildTable = function(data, layer) {
                _.each(data, function(v, province) {
                    tableData[province] = tableData[province] || {};
                    tableData[province][layer.substring(0,3)] = v.value;
                });
                loaded++;
                // Based on the tableData object, build out our table
                // template this uses the js utility _.template
                // See http://documentcloud.github.com/underscore/#template
                // for more details.
                if (loaded >= _.size(layers.activeLayers(year))) {
                    var tableTemplate = '<% _.each(tableData, function(values, province) { %>'
                            + '<tr>'
                            + '<td><%= province %></td>'
                            + '<td><%= values.idp %></td>'
                            + '<td><%= values.ret %></td>'
                            + '<td><%= values.lra %></td>'
                            + '<td><%= values.sec %></td>'
                            + '</tr>'
                        + '<% }); %>';
                    var table = _.template(tableTemplate, {tableData: tableData});
                    $('table#drc-monthly-data').find('tbody').fadeOut('fast', function(){
                        $(this).find('tr').remove();
                        $(this).append(table).fadeIn('fast');
                    });
                }
            };
            // $('.graphs img').attr('src', 'newurl');
            $('.graphs img').hide();
            $('.test span#years').hide();
            $('.test img.year' + year).show();
            $('.test span.year' + year).show();
            _.each(layers.activeLayers(year), function(layer) {
                $.getJSON('data/json/' + layer + '.json', function(data) {
                    buildTable(data, layer);
                });
            });

            drawMap();
        };

        // This is the code for the slider on the page.
        // There are two callbacks acted on: animationCallback which
        // continually runs while the user is dragging, calculates
        // the new position and passes a new layers.length value based
        // on this calculation. callback is fired when the slider has
        // stopped moving and fires our refreshAll function. One
        // important function to note is the refreshOnce function.
        // Because we are setting the slider to drift to the last
        // position on load, we need to fire the refresh function once
        // this sets the initialized variable to true and is only fired
        // once on animationCallback.
        var drag = new Dragdealer('slider', {
            x: 0,
            speed: 10,
            steps: layers.length(year),
            animationCallback: function(x) {
                pos = Math.round(x * (layers.length(year) - 1));
                if (pos < 0 || pos >= layers.length(year)) return;
                layers.pos = pos;
                $('#slide-bar').html(layers.month(year));
                refreshOnce();
            },
            callback: function(x) {
                refreshAll();
            }
        });
        drag.setValue(1); // On page load, drift the slider to the last position.

        // On window resize, trigger the calculation of the space dragdealer occupies.
        $(window).resize(function(e) {
        drag.documentResizeHandler(e);
        });

        $('#year-select').change(function () {
          if (year != $(this).val()) {
            year = $(this).val();

            // Reset the value of the steps in dragdealer
            // and run the function that calculates the stepratios.
            drag.steps = layers.length(year);
            drag.setSteps();
            drag.setValue(0);
            pos = 0;
            
            layers.pos = pos;
            $('#slide-bar').html(layers.month(year));
            
            refreshAll();
          }

        });
        // ul.layers li are the layer selection links located in the
        // right-hand sidebar. If an active layer is not set, set it.
        // grab the link id and pass it to layers.active if the
        // element's parent has the class of active. Finally run the
        // refreshAll() function.
        $('ul.layers li a').click(function(e) {
            e.preventDefault();
            var el = $(e.currentTarget).parent();
            el.hasClass('active') ? el.removeClass('active') : el.addClass('active');
            $('ul.layers li').each(function(i, el) {
                layers.active[$(el).find('a').attr('id')] = $(el).hasClass('active');
            });
            refreshAll();
        });

        $('a.close').click(function(e) {
            e.preventDefault();
            $('.modal, #overlay').removeClass('active');
        });

        // Trigger close buttons with the escape key
        $(document.documentElement).keydown(function (e) {
            if (e.keyCode === 27) { $('a.close').trigger('click'); }
        });

        // The share code that is derived upon clicking Share below the
        // map controls. Based on the users current zoom and pan the
        // embed code generates a custom embed url to share exactly what
        // the user is looking at.
        $('a.share').click(function(e){
            e.preventDefault();
            $('.modal, #overlay').addClass('active');

            var shareContent = $('.share-content');
            var twitter = 'http://twitter.com/intent/tweet?status=' +
            'Mapping Conflict in the DRC: ' + encodeURIComponent(window.location);
            var facebook = 'https://www.facebook.com/sharer.php?t=Relief%20Web%20|%20Mapping%20Conflict%20in%20the%20DRC&u=' +
            encodeURIComponent(window.location);

            document.getElementById('twitter').href = twitter;
            document.getElementById('facebook').href = facebook;

            var center = m.pointLocation(new mm.Point(m.dimensions.x/2,m.dimensions.y/2));
            var embedUrl = 'http://api.tiles.mapbox.com/v2/' + baseLayers.join(',') + (',') + layers.current(year) + '/mm/zoompan,tooltips,legend,bwdetect.html#' + m.coordinate.zoom + '/' + center.lat + '/' + center.lon;
            $('#embed-code-field textarea').attr('value', '<iframe src="' + embedUrl + '" frameborder="0" width="650" height="500"></iframe>');
            $('#embed-code')[0].tabindex = 0;
            $('#embed-code')[0].select();
        });
    }

window.RW = RW;
})(window);
