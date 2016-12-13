//
// stateful helper for binaryajax.js's BinaryFile class
//
// modelled on Flash's ByteArray, mostly, although some names
// (int/short/long) differ in definition
//
(function() {

var SHAPE_TYPES = {
    "0": "Null Shape",
    "1": "Point", // standard shapes
    "3": "PolyLine",
    "5": "Polygon",
    "8": "MultiPoint",
    "11": "PointZ", // 3d shapes
    "13": "PolyLineZ",
    "15": "PolygonZ",
    "18": "MultiPointZ",
    "21": "PointM", // user-defined measurement shapes
    "23": "PolyLineM",
    "25": "PolygonM",
    "28": "MultiPointM",
    "31": "MultiPatch"
}


function BinaryFileWrapper(binFile) {

    this.position = 0;
    this.bigEndian = true;

    this.getByte = function() {
        var byte = binFile.getByteAt(this.position);
        this.position++;
        return byte;
    }

    this.getLength = function() {
        return binFile.getLength();
    }

    this.getSByte = function() {
        var sbyte = binFile.getSByteAt(this.position);
        this.position++;
        return sbyte;
    }

    this.getShort = function() {
        var short = binFile.getShortAt(this.position, this.bigEndian);
        this.position += 2;
        return short;
    }

    this.getSShort = function() {
        var sshort = binFile.getSShortAt(this.position, this.bigEndian);
        this.position += 2;
        return sshort;
    }

    this.getLong = function() {
        var l = binFile.getLongAt(this.position, this.bigEndian);
        this.position += 4;
        return l;
    }

    this.getSLong = function() {
        var l = binFile.getSLongAt(this.position, this.bigEndian);
        this.position += 4;
        return l;
    }

    this.getString = function(iLength) {
        var s = binFile.getStringAt(this.position, iLength);
        this.position += iLength;
        return s;
    }

	this.getDoubleAt = function(iOffset, bBigEndian) {
		// hugs stackoverflow
		// http://stackoverflow.com/questions/1597709/convert-a-string-with-a-hex-representation-of-an-ieee-754-double-into-javascript
		// TODO: check the endianness for something other than shapefiles
		// TODO: what about NaNs and Infinity?
		var a = binFile.getLongAt(iOffset + (bBigEndian ? 0 : 4), bBigEndian);
		var b = binFile.getLongAt(iOffset + (bBigEndian ? 4 : 0), bBigEndian);
		var s = a >> 31 ? -1 : 1;
		var e = (a >> 52 - 32 & 0x7ff) - 1023;
		return s * (a & 0xfffff | 0x100000) * 1.0 / Math.pow(2,52-32) * Math.pow(2, e) + b * 1.0 / Math.pow(2, 52) * Math.pow(2, e);
	}

    this.getDouble = function() {
        var d = this.getDoubleAt(this.position, this.bigEndian);
        this.position += 8;
        return d;
    }

    this.getChar = function() {
        var c = binFile.getCharAt(this.position);
        this.position++;
        return c;
    }
}

// ported from http://code.google.com/p/vanrijkom-flashlibs/ under LGPL v2.1

function ShpFile(binFile) {

    var src = new BinaryFileWrapper(binFile);

    var t1 = new Date().getTime();
    this.header = new ShpHeader(src);

    var t2 = new Date().getTime();
    if (window.console && window.console.log) console.log('parsed header in ' + (t2-t1) + ' ms');

    if (window.console && window.console.log) console.log('got header, parsing records');

    t1 = new Date().getTime();
    this.records = [];
    while (true) {
        try {
                this.records.push(new ShpRecord(src));
        }
        catch (e) {
            if (e.id !== ShpError.ERROR_NODATA) {
                alert(e);
            }
            break;
        }
    }

    t2 = new Date().getTime();
    if (window.console && window.console.log) console.log('parsed records in ' + (t2-t1) + ' ms');

    this.toGeoJSON = function(){
        var geometries = [];
        var x_min = 180;
        var y_min = 90;
        var x_max = -180;
        var y_max = -90;

        if(this.records[0].shapeType == '5'){
            for (var i = 0; i < this.records.length; i++) {
                var geometry = {
                    'type': 'MultiPolygon',
                    'coordinates': []
                };
                var shp = this.records[i];
                var new_shp = [];
                for (var j = 0; j < shp.shape.rings.length; j++) {
                    var ring = shp.shape.rings[j];
                    var new_ring = [];
                    for (var k = 0; k < ring.length; k++) {
                        var point = ring[k];
                        new_ring.push([point.x,point.y]);
                    };
                    new_shp.push([new_ring]);
                    x_min = Math.min(...new_ring.map(x => x[0]),x_min);
                    y_min = Math.min(...new_ring.map(x => x[1]),y_min);
                    x_max = Math.max(...new_ring.map(x => x[0]),x_max);
                    y_max = Math.max(...new_ring.map(x => x[1]),y_max);
                };
                geometry.coordinates = new_shp;
                geometries.push(geometry);
            };
        } else {
            console.log('Only Polygons are supported at the moment');
            return
        }

        data = {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'geometry': {
                    'type': 'GeometryCollection',
                    'geometries': geometries
                },
                'properties': {
                    'bbox': [[x_min,y_min],[x_max,y_max]]
                }
            }
        };

        return data
    }

}

/**
 * The ShpType class is a place holder for the ESRI Shapefile defined
 * shape types.
 * @author Edwin van Rijkom
 *
 */
var ShpType = {

    /**
     * Unknow Shape Type (for internal use)
     */
    SHAPE_UNKNOWN : -1,
    /**
     * ESRI Shapefile Null Shape shape type.
     */
    SHAPE_NULL : 0,
    /**
     * ESRI Shapefile Point Shape shape type.
     */
    SHAPE_POINT : 1,
    /**
     * ESRI Shapefile PolyLine Shape shape type.
     */
    SHAPE_POLYLINE : 3,
    /**
     * ESRI Shapefile Polygon Shape shape type.
     */
    SHAPE_POLYGON : 5,
    /**
     * ESRI Shapefile Multipoint Shape shape type
     * (currently unsupported).
     */
    SHAPE_MULTIPOINT : 8,
    /**
     * ESRI Shapefile PointZ Shape shape type.
     */
    SHAPE_POINTZ : 11,
    /**
     * ESRI Shapefile PolylineZ Shape shape type
     * (currently unsupported).
     */
    SHAPE_POLYLINEZ : 13,
    /**
     * ESRI Shapefile PolygonZ Shape shape type
     * (currently unsupported).
     */
    SHAPE_POLYGONZ : 15,
    /**
     * ESRI Shapefile MultipointZ Shape shape type
     * (currently unsupported).
     */
    SHAPE_MULTIPOINTZ : 18,
    /**
     * ESRI Shapefile PointM Shape shape type
     */
    SHAPE_POINTM : 21,
    /**
     * ESRI Shapefile PolyLineM Shape shape type
     * (currently unsupported).
     */
    SHAPE_POLYLINEM : 23,
    /**
     * ESRI Shapefile PolygonM Shape shape type
     * (currently unsupported).
     */
    SHAPE_POLYGONM : 25,
    /**
     * ESRI Shapefile MultiPointM Shape shape type
     * (currently unsupported).
     */
    SHAPE_MULTIPOINTM : 28,
    /**
     * ESRI Shapefile MultiPatch Shape shape type
     * (currently unsupported).
     */
    SHAPE_MULTIPATCH : 31

};


/**
 * Constructor.
 * @param src
 * @return
 * @throws ShpError Not a valid shape file header
 * @throws ShpError Not a valid signature
 *
 */
function ShpHeader(src)
{
    if (src.getLength() < 100)
        alert("Not a valid shape file header (too small)");

    if (src.getSLong() != 9994)
        alert("Not a valid signature. Expected 9994");

    // skip 5 integers;
    src.position += 5*4;

    // read file-length:
    this.fileLength = src.getSLong();

    // switch endian:
    src.bigEndian = false;

    // read version:
    this.version = src.getSLong();

    // read shape-type:
    this.shapeType = src.getSLong();

    // read bounds:
    this.boundsXY = { x: src.getDouble(),
                      y: src.getDouble(),
                      width: src.getDouble(),
                      height: src.getDouble() };

    this.boundsZ = { x: src.getDouble(), y: src.getDouble() };

    this.boundsM = { x: src.getDouble(), y: src.getDouble() };
}


function ShpRecord(src) {
    var availableBytes = src.getLength() - src.position;

    if (availableBytes == 0)
        throw(new ShpError("No Data", ShpError.ERROR_NODATA));

    if (availableBytes < 8)
        throw(new ShpError("Not a valid record header (too small)"));

    src.bigEndian = true;

    this.number = src.getSLong();
    this.contentLength = src.getSLong();
    this.contentLengthBytes = this.contentLength*2 - 4;
    src.bigEndian = false;
    var shapeOffset = src.position;
    this.shapeType = src.getSLong();

    switch(this.shapeType) {
        case ShpType.SHAPE_POINT:
            this.shape = new ShpPoint(src, this.contentLengthBytes);
            break;
        case ShpType.SHAPE_POINTZ:
            this.shape = new ShpPointZ(src, this.contentLengthBytes);
            break;
        case ShpType.SHAPE_POLYGON:
            this.shape = new ShpPolygon(src, this.contentLengthBytes);
            break;
        case ShpType.SHAPE_POLYLINE:
            this.shape = new ShpPolyline(src, this.contentLengthBytes);
            break;
        case ShpType.SHAPE_MULTIPATCH:
        case ShpType.SHAPE_MULTIPOINT:
        case ShpType.SHAPE_MULTIPOINTM:
        case ShpType.SHAPE_MULTIPOINTZ:
        case ShpType.SHAPE_POINTM:
        case ShpType.SHAPE_POLYGONM:
        case ShpType.SHAPE_POLYGONZ:
        case ShpType.SHAPE_POLYLINEZ:
        case ShpType.SHAPE_POLYLINEM:
            throw(new ShpError(this.shapeType+" Shape type is currently unsupported by this library"));
            break;
        default:
            throw(new ShpError("Encountered unknown shape type ("+this.shapeType+")"));
            break;
    }
}

function ShpPoint(src, size) {
    this.type = ShpType.SHAPE_POINT;
    if (src) {
        if (src.getLength() - src.position < size)
            throw(new ShpError("Not a Point record (too small)"));
        this.x = (size > 0)  ? src.getDouble() : NaN;
        this.y = (size > 0)  ? src.getDouble() : NaN;
    }
}
function ShpPointZ(src, size) {
    this.type = ShpType.SHAPE_POINTZ;
    if (src) {
        if (src.getLength() - src.position < size)
            throw(new ShpError("Not a Point record (too small)"));
        this.x = (size > 0)  ? src.getDouble() : NaN;
        this.y = (size > 0)  ? src.getDouble() : NaN;
        this.z = (size > 16) ? src.getDouble() : NaN;
        this.m = (size > 24) ? src.getDouble() : NaN;
    }
}
function ShpPolygon(src, size) {
    // for want of a super()
    ShpPolyline.apply(this, [src, size]);
    this.type = ShpType.SHAPE_POLYGON;
}
function ShpPolyline(src, size) {
    this.type = ShpType.SHAPE_POLYLINE;
    this.rings = [];
    if (src) {
        if (src.getLength() - src.position < size)
            throw(new ShpError("Not a Polygon record (too small)"));

        src.bigEndian = false;

        this.box = { x: src.getDouble(),
                     y: src.getDouble(),
                     width: src.getDouble(),
                     height: src.getDouble() };

        var rc = src.getSLong();
        var pc = src.getSLong();

        var ringOffsets = [];
        while(rc--) {
            var ringOffset = src.getSLong();
            ringOffsets.push(ringOffset);
        }

        var points = [];
        while(pc--) {
            points.push(new ShpPoint(src,16));
        }

        // convert points, and ringOffsets arrays to an array of rings:
        var removed = 0;
        var split;
        ringOffsets.shift();
        while(ringOffsets.length) {
            split = ringOffsets.shift();
            this.rings.push(points.splice(0,split-removed));
            removed = split;
        }
        this.rings.push(points);
    }
}

function ShpError(msg, id) {
    this.msg = msg;
    this.id = id;
    this.toString = function() {
        return this.msg;
    };
}
ShpError.ERROR_UNDEFINED = 0;
// a 'no data' error is thrown when the byte array runs out of data.
ShpError.ERROR_NODATA = 1;


var BinaryFile = function(strData, iDataOffset, iDataLength) {
	var data = strData;
	var dataOffset = iDataOffset || 0;
	var dataLength = 0;

	this.getRawData = function() {
		return data;
	}

	if (typeof strData == "string") {
		dataLength = iDataLength || data.length;

		this.getByteAt = function(iOffset) {
			return data.charCodeAt(iOffset + dataOffset) & 0xFF;
		}
	} else if (typeof strData == "unknown") {
		dataLength = iDataLength || IEBinary_getLength(data);

		this.getByteAt = function(iOffset) {
			return IEBinary_getByteAt(data, iOffset + dataOffset);
		}
	}

	this.getLength = function() {
		return dataLength;
	}

	this.getSByteAt = function(iOffset) {
		var iByte = this.getByteAt(iOffset);
		if (iByte > 127)
			return iByte - 256;
		else
			return iByte;
	}

	this.getShortAt = function(iOffset, bBigEndian) {
		var iShort = bBigEndian ?
			(this.getByteAt(iOffset) << 8) + this.getByteAt(iOffset + 1)
			: (this.getByteAt(iOffset + 1) << 8) + this.getByteAt(iOffset)
		if (iShort < 0) iShort += 65536;
		return iShort;
	}
	this.getSShortAt = function(iOffset, bBigEndian) {
		var iUShort = this.getShortAt(iOffset, bBigEndian);
		if (iUShort > 32767)
			return iUShort - 65536;
		else
			return iUShort;
	}
	this.getLongAt = function(iOffset, bBigEndian) {
		var iByte1 = this.getByteAt(iOffset),
			iByte2 = this.getByteAt(iOffset + 1),
			iByte3 = this.getByteAt(iOffset + 2),
			iByte4 = this.getByteAt(iOffset + 3);

		var iLong = bBigEndian ?
			(((((iByte1 << 8) + iByte2) << 8) + iByte3) << 8) + iByte4
			: (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8) + iByte1;
		if (iLong < 0) iLong += 4294967296;
		return iLong;
	}
	this.getSLongAt = function(iOffset, bBigEndian) {
		var iULong = this.getLongAt(iOffset, bBigEndian);
		if (iULong > 2147483647)
			return iULong - 4294967296;
		else
			return iULong;
	}
	this.getStringAt = function(iOffset, iLength) {
		var aStr = [];
		for (var i=iOffset,j=0;i<iOffset+iLength;i++,j++) {
			aStr[j] = String.fromCharCode(this.getByteAt(i));
		}
		return aStr.join("");
	}

	this.getCharAt = function(iOffset) {
		return String.fromCharCode(this.getByteAt(iOffset));
	}
	this.toBase64 = function() {
		return window.btoa(data);
	}
	this.fromBase64 = function(strBase64) {
		data = window.atob(strBase64);
	}
}

window.BinaryFile = BinaryFile;
window.ShpFile = ShpFile;

})();
