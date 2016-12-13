## shp2geojson

This is a small script to handle a [shp file](https://en.wikipedia.org/wiki/Shapefile) and transform it to [GeoJSON](https://en.wikipedia.org/wiki/GeoJSON).

I could say it is based on, but it is almost complete copy of [shapefile-js by RandomEtc](https://github.com/RandomEtc/shapefile-js). I just re-organised the code and added a small function to transform it.

So far, only `Polygons` are supported but implementing `Points` and `Lines` shouldn't be a problem.

I use this for my personal projects, specifically to handle shape files directly in the browser and visualise them with [mapbox-gl](https://www.mapbox.com/mapbox-gl-js/).

Check the [demo](https://spadarian.github.io/shp2geojson/) for details on how to use it.
