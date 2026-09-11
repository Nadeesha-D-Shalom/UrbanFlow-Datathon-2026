# NYC TLC Taxi-Zone Geometry Source

The dashboard boundary layer uses the official NYC Taxi & Limousine Commission taxi-zone shapefile and lookup table:

- Boundary archive: https://d37ci6vzurychx.cloudfront.net/misc/taxi_zones.zip
- Lookup table: https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv
- TLC documentation: https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page

The local `loc_id` values were checked against the official `LocationID` values and zone names. All 265 IDs and names match exactly. The official shapefile contains 263 polygon features; IDs 264 (`Unknown`) and 265 (`Outside of NYC`) are valid TLC lookup categories without ordinary geographic polygons and are therefore excluded from the map layer. No coordinates or geometry were fabricated.