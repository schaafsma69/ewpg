/* global config: true */
/* exported config */
if (typeof config === "undefined") {
  var config = {
    // variables go here
  };

  if (typeof angular !== "undefined") {
    angular.module("risevision.common.i18n.config", [])
      .constant("LOCALES_PREFIX", "locales/translation_")
      .constant("LOCALES_SUFIX", ".json");
  }
}

/* global gadgets */

var RiseVision = RiseVision || {};
RiseVision.WebPage = {};

RiseVision.WebPage = (function (document, gadgets) {

  "use strict";

  // private variables
  var _prefs = null,
    _additionalParams = {},
    _url = "",
    _intervalId = null,
    _background = null;

  /*
   *  Private Methods
   */

  function _configurePage() {
    var container = document.getElementById("webpage-container"),
      frame = document.getElementById("webpage-frame"),
      aspectRatio =  (_prefs.getInt("rsH") / _prefs.getInt("rsW")) * 100,
      scrollHorizVal = (_additionalParams.scrollHorizontal > 0) ? _additionalParams.scrollHorizontal : 0,
      scrollVertVal = (_additionalParams.scrollVertical > 0) ? _additionalParams.scrollVertical : 0,
      zoom = parseFloat(_additionalParams.zoom), blocker, zoomStyle, marginStyle;

    if (container && frame) {
      blocker = container.getElementsByClassName("blocker")[0];

      // Hiding iframe container, visible when the iframe successfully loads
      container.style.visibility = "hidden";

      // set the padding-bottom with the aspect ratio % (responsive)
      if (scrollVertVal !== 0) {
        // recalculate aspect ratio
        aspectRatio += (scrollVertVal / _prefs.getInt("rsW")) * 100;
      }
      container.setAttribute("style", "padding-bottom:" + aspectRatio + "%");

      // Configure interactivity of iframe
      blocker.style.display = (_additionalParams.interactive) ? "none" : "block";
      frame.setAttribute("scrolling",
        (_additionalParams.scrollbars) ? "yes" : "no");

      // Configure the zoom (scale) styling
      zoomStyle = "-ms-zoom:" + zoom + ";" +
        "-moz-transform: scale(" + zoom + ");" +
        "-moz-transform-origin: 0 0;" +
        "-o-transform: scale(" + zoom + ");" +
        "-o-transform-origin: 0 0;" +
        "-webkit-transform: scale(" + zoom + ");" +
        "-webkit-transform-origin: 0 0;";

      zoomStyle += "width: " + ((1 / zoom) * 100) + "%;" +
      "height: " + ((1 / zoom) * 100) + "%;";

      // Apply the zoom (scale) on the iframe
      frame.setAttribute("style", zoomStyle);

      if (scrollHorizVal !== 0 || scrollVertVal !== 0) {
        // Configure the margin styling
        marginStyle = "margin: " + "-" + scrollVertVal + "px 0 0 -" +
          scrollHorizVal + "px;";

        /* Apply the margin styling on the iframe while maintaining
         the zoom styling */
        frame.setAttribute("style", zoomStyle + marginStyle);
      }
    }
  }

  function _loadFrame() {
    var frame = document.getElementById("webpage-frame"),
      container = document.getElementById("webpage-container"),
      hasParams = /[?#&]/.test(_url),
      randomNum = Math.ceil(Math.random() * 100),
      refreshURL = hasParams ?
          _url + "&dummyVar=" + randomNum :
          _url + "?dummyVar=" + randomNum;

    if (container && frame) {
      frame.onload = function () {
        frame.onload = null;

        // Show the iframe container
        container.style.visibility = "visible";

        // Run setInterval to reload page based on the data refresh value
        if (_additionalParams.refresh > 0 && _intervalId === null) {
          _intervalId = setInterval(function () {
            _loadFrame();
          }, _additionalParams.refresh);
        }
      };

      frame.setAttribute("src", refreshURL);
    }
  }

  function _animateFrame() {
	// Reset position
    jQuery("#webpage-frame").css({top:0, left:0});
	var wpeX = (_additionalParams.scrollHorizontalEnd > 0) ? _additionalParams.scrollHorizontalEnd : 0;
	var wpeY = (_additionalParams.scrollVerticalEnd > 0) ? _additionalParams.scrollVerticalEnd : 0;
	var wpeD = (_additionalParams.scrollDuration > 0) ? _additionalParams.scrollDuration : 0;
	var wpeT = (_additionalParams.scrollTimeoutStart > 0) ? _additionalParams.scrollTimeoutStart : 0;
	
	// Start animation
	if (_additionalParams.animated && (wpeX>0 || wpeY>0 )) {
		wpeX = "-=" + wpeX;
		wpeY = "-=" + wpeY;
		if (wpeT > 0) {
			jQuery("#webpage-frame").delay(wpeT).animate({ top: wpeY, left: wpeX }, wpeD );
		} else {
			jQuery("#webpage-frame").animate({ top: wpeY, left: wpeX }, wpeD );
		}
	}
  }
  
  function _unloadFrame() {
    var frame = document.getElementById("webpage-frame");

    if (_additionalParams.refresh > 0) {
      clearInterval(_intervalId);
    }

    if (frame) {
      frame.src = "about:blank";
    }

  }

  function _ready() {
    gadgets.rpc.call("", "rsevent_ready", null, _prefs.getString("id"),
      true, true, true, true, false);	  
  }

  function _backgroundReady() {
    // Configure the value for _url
    _url = _additionalParams.url;

    // Add http:// if no protocol parameter exists
    if (_url.indexOf("://") === -1) {
      _url = "http://" + _url;
    }
	
    _configurePage();
    _ready();
  }

  /*
   *  Public Methods
   */

  function pause() {
    _unloadFrame();
  }

  function play() {
    _loadFrame();
	_animateFrame();
  }

  function stop() {
    _unloadFrame();
  }

  function setAdditionalParams(params) {
    _prefs = new gadgets.Prefs();
    _additionalParams = params;

    // create and initialize the Background instance
    _background = new RiseVision.Common.Background(_additionalParams);
    _background.init(_backgroundReady);
  }

  return {
    setAdditionalParams: setAdditionalParams,
    pause: pause,
    play: play,
    stop: stop
  };

})(document, gadgets);

var RiseVision = RiseVision || {};
RiseVision.Common = RiseVision.Common || {};

RiseVision.Common.Background = function (data) {
  "use strict";

  var _callback = null,
    _ready = false,
    _background = null,
    _storage = null,
    _refreshDuration = 900000, // 15 minutes
    _isStorageFile = false,
    _separator = "";

  /*
   * Private Methods
   */
  function _refreshTimer() {
    setTimeout(function backgroundRefresh() {
      _background.style.backgroundImage = "url(" + data.background.image.url + _separator + "cb=" + new Date().getTime() + ")";
      _refreshTimer();
    }, _refreshDuration);
  }

  function _backgroundReady() {
    _ready = true;

    if (data.background.useImage && !_isStorageFile) {
      // start the refresh poll for non-storage background image
      _refreshTimer();
    }

    if (_callback && typeof _callback === "function") {
      _callback();
    }
  }

  function _configure() {
    var str;

    _background = document.getElementById("background");
    _storage = document.getElementById("backgroundStorage");

    // set the document background
    document.body.style.background = data.background.color;

    if (_background) {
      if (data.background.useImage) {
        _background.className = data.background.image.position;
        _background.className = data.background.image.scale ? _background.className + " scale-to-fit"
          : _background.className;

        _isStorageFile = (Object.keys(data.backgroundStorage).length !== 0);

        if (!_isStorageFile) {
          str = data.background.image.url.split("?");

          // store this for the refresh timer
          _separator = (str.length === 1) ? "?" : "&";

          _background.style.backgroundImage = "url(" + data.background.image.url + ")";
          _backgroundReady();
        } else {
          if (_storage) {
            // Rise Storage
            _storage.addEventListener("rise-storage-response", function (e) {
              if (e.detail && e.detail.files && e.detail.files.length > 0) {
                _background.style.backgroundImage = "url(" + e.detail.files[0].url + ")";
              }

              if (!_ready) {
                _backgroundReady();
              }
            });

            _storage.setAttribute("folder", data.backgroundStorage.folder);
            _storage.setAttribute("fileName", data.backgroundStorage.fileName);
            _storage.setAttribute("companyId", data.backgroundStorage.companyId);
            _storage.go();
          } else {
            console.log("Missing element with id value of 'backgroundStorage'");
          }
        }
      } else {
        _backgroundReady();
      }
    } else {
      console.log("Missing element with id value of 'background'");
    }
  }

  /*
   *  Public Methods
   */
  function init(cb) {
    if (!_ready) {
      if (cb) {
        _callback = cb;
      }

      _configure();

    } else if (cb && typeof cb === "function") {
      cb();
    }
  }

  return {
    "init": init
  };
};

/* global RiseVision, gadgets */

(function (window, gadgets) {
  "use strict";

  var prefs = new gadgets.Prefs(),
    id = prefs.getString("id");

  // Disable context menu (right click menu)
  window.oncontextmenu = function () {
    return false;
  };

  function play() {
    RiseVision.WebPage.play();
  }

  function pause() {
    RiseVision.WebPage.pause();
  }

  function stop() {
    RiseVision.WebPage.stop();
  }

  function additionalParams(names, values) {
    if (Array.isArray(names) && names.length > 0 && names[0] === "additionalParams") {
      if (Array.isArray(values) && values.length > 0) {
        RiseVision.WebPage.setAdditionalParams(JSON.parse(values[0]));
      }
    }
  }

  window.addEventListener("polymer-ready", function() {
    if (id && id !== "") {
      gadgets.rpc.register("rscmd_play_" + id, play);
      gadgets.rpc.register("rscmd_pause_" + id, pause);
      gadgets.rpc.register("rscmd_stop_" + id, stop);

      gadgets.rpc.register("rsparam_set_" + id, additionalParams);
      gadgets.rpc.call("", "rsparam_get", null, id, ["additionalParams"]);
    }
  });

})(window, gadgets);



/* jshint ignore:start */
var _gaq = _gaq || [];

_gaq.push(['_setAccount', 'UA-57092159-6']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
/* jshint ignore:end */
