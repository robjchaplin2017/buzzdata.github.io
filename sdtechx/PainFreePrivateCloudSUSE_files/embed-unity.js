(function() {

  if (!Object.create) {
    Object.create = (function(){
      function F(){}

      return function(o){
        if (arguments.length != 1) {
          throw new Error('Object.create implementation only accepts one parameter.');
        }
        F.prototype = o;
        return new F()
      }
    })()
  }

  if (!this.EmbedUnity){
    this.EmbedUnity = {};

    var loadMultiple = function(){
      var  _ref;
      return (_ref = EmbedUnity.Multiple).load.apply(_ref,arguments);
    };

    var unloadMultiple = function(){
      var  _ref;
      return (_ref = EmbedUnity.Multiple).unload.apply(_ref,arguments);
    };

    this.EmbedUnity.loadMultiple = loadMultiple;
    this.EmbedUnity.unloadMultiple = unloadMultiple;
  }

}).call(this);
(function() {

  this.EmbedUnity.Utils = {};

  var calculateSize = function(options,hsize,vsize){
    var tilesize = 192;
    if(hsize)
      options.width = tilesize * hsize;
    else
      options.width = tilesize * 3;

    if(vsize)
      options.height = tilesize * vsize;
    else
      options.height = tilesize * 2;
    return options;
  };

  var $$ = function(cls) {
    var el, reg, _i, _len, _ref, _results;
    if (typeof document.getElementsByClassName === 'function') {
      return document.getElementsByClassName(cls);
    } else if (typeof document.querySelectorAll === 'function') {
      return document.querySelectorAll("." + cls);
    } else {
      reg = new RegExp("(^|\\s)" + cls + "(\\s|$)");
      _ref = document.getElementsByTagName('*');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        el = _ref[_i];
        if (reg.test(el.className)) {
          _results.push(el);
        }
      }
      return _results;
    }
  };

  var bind = function(element, name, callback) {
    if (element.addEventListener) {
      return element.addEventListener(name, callback, false);
    } else {
      return element.attachEvent("on" + name, callback);
    }
  };

  var attr = function(element, attr, value) {
    if (value != null) {
      return element.setAttribute(attr, value);
    } else {
      return element.getAttribute(attr);
    }
  };

  var css = function(element, css) {
    return element.style.cssText += ';' + css;
  };

  var append = function(element, child) {
    return element.appendChild(child);
  };

  var insertAfter = function(element, child) {
    return element.parentNode.insertBefore(child, element.nextSibling);
  };

  var insertBefore = function(element, child) {
    return element.parentNode.insertBefore(child, element);
  };

  var goToExternalUrl = function(url){
    window.open(url, '_blank');
  };

  EmbedUnity.Utils.bind = bind;
  EmbedUnity.Utils.css = css;
  EmbedUnity.Utils.append = append;
  EmbedUnity.Utils.insertAfter = insertAfter;
  EmbedUnity.Utils.insertBefore = insertBefore;
  EmbedUnity.Utils.$$ = $$;
  EmbedUnity.Utils.attr = attr;
  EmbedUnity.Utils.calculateSize = calculateSize;
  EmbedUnity.Utils.goToExternalUrl = goToExternalUrl;

}).call(this);
(function() {
  EmbedUnity.Multiple = (function(){

    var $$ = EmbedUnity.Utils.$$;
    var attr = EmbedUnity.Utils.attr;
    var calculateSize = EmbedUnity.Utils.calculateSize;
    var bind = EmbedUnity.Utils.bind;

    Multiple.load = function(options){
      return Multiple.instance || (Multiple.instance = new Multiple(options));
    };

    // used only for testing purposes...
    Multiple.unload = function(options){
      var k;
      if(Multiple.instance){
        if(Multiple.overlay){
          delete Multiple.overlay;
        }
        for( k in Multiple.instance.previews){
          delete  Multiple.instance.previews[k];
        }
        delete Multiple.instance;
      }
    };

    Multiple.prototype.defaults = {
      selectorClass: 'lb-unity'
    };

    Multiple.prototype.setOptions = function(options){
      var key,value;
      this.options || (this.options = {});
      if(options == null){
        options = {};
      }
      for (key in this.defaults){
        value = this.defaults[key];
        if (options[key] == null){
          options[key] = value;
        }
      }
      for (key in options){
        value = options[key];
        this.options[key] = value;
      }
    };

    Multiple.prototype.createOverlay = function(el){
      var _this, opts, lookbook,
          secure, baseUrl, eloquaParams;
      _this = this;
      opts = {};
      lookbook = attr(el,'data-lookbook');
      eloquaParams = attr(el, 'data-eloqua');

      baseUrl = "://" + attr(el,'data-domain') + "/";
      secure = window.location.protocol === 'https:';
      baseUrl = (secure ? 'https' : 'http') + baseUrl;

      var lookbookId = attr(el, 'data-lookbook-id');
      var tile = attr(el, 'data-lookbook-tile');
      var isOverlay2 = !!lookbookId;

      if (isOverlay2) {
        opts.overlaySrc = baseUrl + lookbookId;
        opts.mobileSrc = baseUrl + lookbookId;
        if (tile) {
          opts.overlaySrc += '/' + tile;
          opts.mobileSrc += '/' + tile;
        }
      } else {
        opts.overlaySrc = baseUrl + 'overlay/' + lookbook;
        opts.mobileSrc = baseUrl + 'mobile/' + lookbook;
      }

      opts.overlaySrc += '?lb-usage=overlay';
      // hack to append eloqua params
      if (eloquaParams !== null){
        opts.overlaySrc += '&elqcontact=' + eloquaParams;
      }


      if (EmbedUnity.Fallback.isEnabled()){
        this.overlay = new EmbedUnity.Fallback(opts);
      } else if (EmbedUnity.Mobile.isEnabled()){
        this.overlay = new EmbedUnity.Mobile(opts);
      } else {
        this.overlay = new EmbedUnity.Overlay(opts);

        // postMessagebinding
        bind(window, 'message', function(e) {
          if(e.data === "lb-close-overlay"){
            _this.overlay.hide();
          }else if(e.data.type === "lb-404-error"){
            _this.previews[e.data.lookbook].hideIframeDiv();
          }
        });
      }
    };

    function Multiple(options){
      var i, els, el, preview, lookbook, domain, opts, hsize, vsize;

      // this sets defaults
      this.setOptions(options);

      this.previews = {};

      els = $$(this.options.selectorClass);

      // creating previews iframes
      for( i=0; i< els.length; i++){
        el = els[i];
        opts = {};

        if (el){
          hsize = attr(el,'data-xsize');
          vsize = attr(el,'data-ysize');
          calculateSize(opts,hsize,vsize);
          lookbook = attr(el,'data-lookbook');
          domain = attr(el,'data-domain');
        }

        if (lookbook){
          opts.el = el;
          if(attr(el, 'data-lookbook-link')) {
            preview = new EmbedUnity.LinkEmbed(opts);
          } else if(attr(el, 'data-lookbook-img')) {
            preview = new EmbedUnity.PreviewImg(opts);
          } else if(attr(el, 'data-lookbook-tiles')) {
            preview = new EmbedUnity.PreviewTiles(opts);
          } else {
            preview = new EmbedUnity.Preview(opts);
          }
          this.previews[domain+'/'+lookbook] = preview;
        }

      }

      // setting first lookbook for overlay
      if(els[0]){
        this.createOverlay(els[0]);
      }
    }

    return Multiple;
  })();

}).call(this);
(function() {
  EmbedUnity.Mobile = (function(){

    Mobile.isEnabled = function(){
      var check = false;
      if( navigator.userAgent.match(/iPad/i) != null)
        return true;

      (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
      (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
      return check;
    };

    function Mobile(options){
      this.options = options != null ? options : {};
      this.iframe = {src: options.mobileSrc};
    }

    Mobile.prototype.show = function() {
      var sourceUrl = this.iframe.src;
      sourceUrl = sourceUrl.replace("?lb-usage=overlay", "");
      EmbedUnity.Utils.goToExternalUrl(sourceUrl);
    };

    Mobile.prototype.setSrc = function(src) {
      this.iframe = { src: src };
    };

    return Mobile;
  })();

}).call(this);
(function() {
  EmbedUnity.Fallback = (function(){

    Fallback.isEnabled = function(){
      return !(('postMessage' in window) && window.postMessage);
    };

    function Fallback(options){
      this.options = options != null ? options : {};
      this.iframe = {src: options.overlaySrc};
    }

    Fallback.prototype.show = function() {
      var sourceUrl = this.iframe.src;
      sourceUrl = sourceUrl.replace("?lb-usage=overlay", "");
      EmbedUnity.Utils.goToExternalUrl(sourceUrl);
    };

    Fallback.prototype.setSrc = function(src) {
      this.iframe = { src: src };
    };

    return Fallback;
  })();

}).call(this);
(function() {
  var bind = EmbedUnity.Utils.bind;
  var css = EmbedUnity.Utils.css;
  var attr = EmbedUnity.Utils.attr;
  var insertAfter = EmbedUnity.Utils.insertAfter;
  var insertBefore = EmbedUnity.Utils.insertBefore;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  EmbedUnity.Preview = (function(){

    Preview.prototype.iframeCSS = 'background: transparent;\nborder: 0px none transparent;\noverflow: hidden;\nvisibility: hidden;\nmargin: 0;\npadding: 0;\n-webkit-tap-highlight-color: transparent;\n-webkit-touch-callout: none;';

    Preview.prototype.css = '';

    Preview.prototype.setUrls = function(){
      var el = this.options.el;
      var secure, baseUrl;
      var lookbook;
      var lookbookId;
      var tile;
      var eloquaParams = attr(el, 'data-eloqua');

      lookbook = attr(el,'data-lookbook');
      baseUrl = "://" + attr(el,'data-domain') + "/";
      secure = window.location.protocol === 'https:';
      baseUrl = (secure ? 'https' : 'http') + baseUrl;
      this.options.previewSrc = baseUrl + 'thumb/'   + lookbook;

      lookbookId = attr(el, 'data-lookbook-id');
      tile = attr(el, 'data-lookbook-tile');

      if(lookbookId) {
        this.options.overlaySrc = baseUrl + lookbookId;
        if (tile)
          this.options.overlaySrc += '/' + tile;
      } else {
        this.options.overlaySrc = baseUrl + 'overlay/' + lookbook;
      }

      this.options.overlaySrc += '?lb-usage=overlay';
      // hack to append eloqua params
      if (eloquaParams !== null){
        this.options.overlaySrc += '&elqcontact=' + eloquaParams;
      }
    };

    function Preview(options){
      var _this = this;
      this.options = options != null ? options : {};

      // sets url for overlay
      this.setUrls();

      this.iframe = this.renderFrame();
      this.iframe.className = 'lb-unity-preview';

      this.iframeDiv = this.renderDiv();

      this.append();

      if (!this.options.responsive) {

        this.hover = __bind(function(){
          css(this.iframeDiv,"background:url('https://buzzdata.s3.amazonaws.com/black-35.png');");
          // TODO use transparent PNG here???
        },this);

        this.out = __bind(function(){
          var width = parseInt(this.options.width, 10);
          var height = parseInt(this.options.height, 10);
          // TODO use super transparent png here?

          if (this.options.responsive) {
            width = '100%';
            height = '100%';
          } else {
            width = width + 'px';
            height = height + 'px';
          }

          this.iframeDiv.style.cssText = "z-index: 9999; cursor: pointer; position: absolute; width:" + width + "; height:" + height + ";background:url('https://buzzdata.s3.amazonaws.com/black-00.png');";
        },this);

        bind(this.iframeDiv, 'click', function() {
          var instance = EmbedUnity.loadMultiple();
          instance.overlay.setSrc(_this.options.overlaySrc);
          instance.overlay.show();
        });

        bind(this.iframeDiv, 'mouseover', this.hover);
        bind(this.iframeDiv, 'mouseout', this.out);
      }
    }


    Preview.prototype.append = function(){
      var iframe,
        _this = this;
      var el = this.options.el;
      var width = parseInt(this.options.width, 10);
      var height = parseInt(this.options.height, 10);

      var wrapper = document.createElement('div');
      wrapper.className = 'lb-unity-wrapper';
      if (this.options.responsive) {
        wrapper.style.cssText = "cursor: pointer";
      } else {
        wrapper.style.cssText = "width:" + width + "px; height:" + height + "px;";
        wrapper.appendChild(this.iframeDiv);
      }

      wrapper.appendChild(this.iframe);
      if(el) insertAfter(el, wrapper);

      if (this.options.responsive) {
        bind(wrapper, 'click', function() {
          var instance = EmbedUnity.loadMultiple();
          instance.overlay.setSrc(_this.options.overlaySrc);
          instance.overlay.show();
        });
      }
    };

    Preview.prototype.renderFrame = function() {
      var iframe,
        _this = this;

      var width = parseInt(this.options.width, 10);
      var height = parseInt(this.options.height, 10);

      iframe = document.createElement('iframe');
      iframe.setAttribute('frameBorder', '0');
      iframe.setAttribute('allowtransparency', 'true');
      iframe.setAttribute('frameBorder', '0');
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('width',width);
      iframe.setAttribute('height',height);
      iframe.style.cssText = this.iframeCSS;
      bind(iframe, 'load', function() {
        iframe.style.visibility = 'visible';
      });
      iframe.src = this.options.previewSrc;

      return iframe;
    };

    Preview.prototype.renderDiv = function() {
      var iframeDiv;
      var width = parseInt(this.options.width, 10);
      var height = parseInt(this.options.height, 10);

      if (this.options.responsive) {
        width = '100%';
        height = '100%';
      } else {
        width = width + 'px';
        height = height + 'px';
      }

      iframeDiv = document.createElement('div');
      iframeDiv.style.cssText = "z-index: 9999; cursor: pointer; position: absolute; width:" + width + "; height:" + height + ";background:url('https://buzzdata.s3.amazonaws.com/black-00.png');";
      return iframeDiv;

    };

    Preview.prototype.hideIframeDiv = function() {
      css(this.iframeDiv,"display: none;");
    };

    return Preview;

  })();


}).call(this);
(function() {
  var bind = EmbedUnity.Utils.bind;
  var css = EmbedUnity.Utils.css;
  var attr = EmbedUnity.Utils.attr;
  var Preview = EmbedUnity.Preview;
  var insertAfter = EmbedUnity.Utils.insertAfter;
  var insertBefore = EmbedUnity.Utils.insertBefore;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  EmbedUnity.PreviewImg = (function(){
    PreviewImg.prototype = Object.create(Preview.prototype);
    PreviewImg.prototype.constructor = PreviewImg;

    PreviewImg.prototype.iframeCSS = 'background: transparent;\nborder: 0px none transparent;\noverflow: hidden;\nmargin: 0;\npadding: 0;\n-webkit-tap-highlight-color: transparent;\n-webkit-touch-callout: none;';

    function PreviewImg(options){
      var el = options.el;
      // override dimensions
      this.options = options !== null ? options : {};
      this.options.width = attr(el, 'data-lookbook-img-width');
      this.options.height = attr(el, 'data-lookbook-img-height');
      this.options.responsive = attr(el, 'data-lookbook-responsive');

      var windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

      if (this.options.width >= windowWidth) {
        var newWidth = windowWidth - 40; // allow for spacing
        var newHeight = (newWidth * this.options.height) / this.options.width;

        this.options.width = newWidth;
        this.options.height = newHeight;
      }

      Preview.call(this, this.options); // or Construct.apply(this, [x, y]);
    }

    PreviewImg.prototype.renderFrame = function() {
      var iframe,
        _this = this;

      var width = parseInt(this.options.width, 10);
      var height = parseInt(this.options.height, 10);
      var el = this.options.el;

      iframe = document.createElement('img');
      if (!this.options.responsive) {
        iframe.setAttribute('width',width);
        iframe.setAttribute('height',height);
        iframe.style.cssText = this.iframeCSS + 'width:' + width + 'px;\n height:' + height + 'px';
      }
      iframe.src = attr(el, 'data-lookbook-img');

      if (attr(el, 'data-refresh-image')) {
        iframe.src = iframe.src + '?' + Date.now();
      }

      return iframe;
    };

    return PreviewImg;
  })();


}).call(this);
(function() {
  var bind = EmbedUnity.Utils.bind;
  var css = EmbedUnity.Utils.css;
  var $$ = EmbedUnity.Utils.$$;
  var attr = EmbedUnity.Utils.attr;
  var insertAfter = EmbedUnity.Utils.insertAfter;
  var insertBefore = EmbedUnity.Utils.insertBefore;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  EmbedUnity.PreviewTiles = (function(){
    PreviewTiles.prototype.constructor = PreviewTiles;

    PreviewTiles.prototype.setUrls = function(){
      var el = this.options.el;
      var secure, baseUrl;
      var lookbook;
      var lookbookId;
      var tile;
      var eloquaParams = attr(el, 'data-eloqua');

      lookbook = attr(el,'data-lookbook');
      baseUrl = "://" + attr(el,'data-domain') + "/";
      secure = window.location.protocol === 'https:';
      baseUrl = (secure ? 'https' : 'http') + baseUrl;

      lookbookId = attr(el, 'data-lookbook-id');

      if(lookbookId) {
        this.options.overlaySrc = baseUrl + lookbookId;
      } else {
        this.options.overlaySrc = baseUrl + 'overlay/' + lookbook;
      }

      this.options.overlaySrc += '?lb-usage=overlay';
      // hack to append eloqua params
      if (eloquaParams !== null){
        this.options.overlaySrc += '&elqcontact=' + eloquaParams;
      }
    };

    function PreviewTiles(options){
      var el = options.el;
      var link, i;
      var _this = this;
      // override dimensions
      this.options = options != null ? options : {};
      this.options.length = attr(el, 'data-lookbook-tiles');
      this.setUrls();

      var links = document.querySelectorAll('.tiletablewrapper a');
      for (i = 0; i < links.length; i++) {
        link = links[i];
        bind(link, 'click', function(e) {
          e.preventDefault();
          var instance = EmbedUnity.loadMultiple();
          var tile = attr(e.target.parentElement, 'data-tile-url');

          // fallback to old attr if new one fails
          if (!tile) {
            tile = attr(e.target.parentElement, 'href');
          } else {
            tile = 'http://' + tile;
          }

          tile += '?lb-usage=overlay';

          instance.overlay.setSrc(tile);
          instance.overlay.show();
        });
      }


    }

    return PreviewTiles;
  })();


}).call(this);

(function() {
  var bind = EmbedUnity.Utils.bind;
  var css = EmbedUnity.Utils.css;
  var attr = EmbedUnity.Utils.attr;
  var insertAfter = EmbedUnity.Utils.insertAfter;
  var insertBefore = EmbedUnity.Utils.insertBefore;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  EmbedUnity.LinkEmbed = (function(){

    LinkEmbed.prototype.setUrls = function(){
      var el = this.options.el;
      var secure, baseUrl;
      var lookbook;
      var lookbookId;
      var tile;
      var eloquaParams = attr(el, 'data-eloqua');

      lookbook = attr(el,'data-lookbook');
      baseUrl = "://" + attr(el,'data-domain') + "/";
      secure = window.location.protocol === 'https:';
      baseUrl = (secure ? 'https' : 'http') + baseUrl;
      this.options.previewSrc = baseUrl + 'thumb/'   + lookbook;

      lookbookId = attr(el, 'data-lookbook-id');
      tile = attr(el, 'data-lookbook-tile');

      if(lookbookId) {
        this.options.overlaySrc = baseUrl + lookbookId;
        if (tile)
          this.options.overlaySrc += '/' + tile;
      } else {
        this.options.overlaySrc = baseUrl + 'overlay/' + lookbook;
      }

      this.options.overlaySrc += '?lb-usage=overlay';
      // hack to append eloqua params
      if (eloquaParams !== null){
        this.options.overlaySrc += '&elqcontact=' + eloquaParams;
      }
    };

    function LinkEmbed(options){
      var _this = this;
      this.options = options != null ? options : {};
      var el = this.options.el;

      // sets url for overlay
      this.setUrls();

      bind(el, 'click', function(e) {
        e.preventDefault();
        var instance = EmbedUnity.loadMultiple();
        instance.overlay.setSrc(_this.options.overlaySrc);
        instance.overlay.show();
      });

    }

    return LinkEmbed;

  })();

}).call(this);

(function() {
  // bind this
  var bind = EmbedUnity.Utils.bind;
  var css = EmbedUnity.Utils.css;
  var append = EmbedUnity.Utils.append;

  EmbedUnity.Overlay = (function(){

    Overlay.prototype.iframeCSS = 'background: transparent;\nborder: 0px none transparent;\noverflow: hidden;\nvisibility: hidden;\nmargin: 0;\npadding: 0;\n-webkit-tap-highlight-color: transparent;\n-webkit-touch-callout: none;';

    Overlay.prototype.css = 'position: fixed;\nleft: 0;\ntop: 0;\nwidth: 100%;\nheight: 100%;\nz-index: 9999;\ndisplay: none;';

    function Overlay(options){
      this.options = options != null ? options : {};
      this.originalBodyOverflowStyle = document.body.style.overflow;
      this.render();
    }

    Overlay.prototype.render = function(){
      if(this.iframe){
        remove(this.iframe);
      }
      this.iframe = this.renderFrame();
      this.iframe.className = 'lb-unity-overlay';
      css(this.iframe, this.css);
      return append(document.body, this.iframe);
    };

    Overlay.prototype.renderFrame = function() {
      var iframe,
        _this = this;
      iframe = document.createElement('iframe');
      iframe.setAttribute('frameBorder', '0');
      iframe.setAttribute('allowtransparency', 'true');
      iframe.style.cssText = this.iframeCSS;
      bind(iframe, 'load', function() {
        if (_this.changedSrc) {
          iframe.contentWindow.postMessage('lb-show-overlay',iframe.src);
          _this.changedSrc = false;
        }
        iframe.style.visibility = 'visible';
      });
      iframe.src = this.options.overlaySrc;
      return iframe;
    };

    Overlay.prototype.show = function() {
      document.body.style.overflow = "hidden";
      this.iframe.style.display = 'block';
      this.iframe.contentWindow.postMessage('lb-show-overlay',this.iframe.src);
    };

    Overlay.prototype.hide = function() {
      document.body.style.overflow = this.originalBodyOverflowStyle;
      this.iframe.style.display = 'none';
    };

    // we do this only for the real overlay and not for the fallback/mobile versions
    Overlay.prototype.setSrc = function(src) {
      // only if src changed
      if (this.iframe.src !== src) {
        this.iframe.style.visibility = 'hidden';
        this.iframe.src = src;
        this.changedSrc = true; // hack to send delayed post message
      }
    };

    return Overlay;
  })();
}).call(this);
(function() {
  EmbedUnity.Utils.bind(window, 'load', function() {
    EmbedUnity.loadMultiple();
  });
}).call(this);











