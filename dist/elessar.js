!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.RangeBar=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var $ = (window.jQuery);
var requestAnimationFrame = _dereq_('./raf');

function Indicator(options) {
  var $el = $('<div class="elessar-indicator">');

  if(options.indicatorClass) $el.addClass(options.indicatorClass);

  var drawing = false;

  $el.val = function(pos) {
    if (drawing) return $el;
    requestAnimationFrame(function() {
      drawing = false;
      $el.css({left: 100*pos + '%'});
    });
    drawing = true;

    return $el;
  };

  if(options.value) $el.val(options.value);

  return $el;
}

module.exports = Indicator;
},{"./raf":2}],2:[function(_dereq_,module,exports){
// thanks to http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
var lastTime = 0;
var vendors = ['webkit', 'moz'], requestAnimationFrame = window.requestAnimationFrame;
for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
  requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
}

if (!requestAnimationFrame) {
  requestAnimationFrame = function(callback, element) {
    var currTime = new Date().getTime();
    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
    var id = window.setTimeout(function() { callback(currTime + timeToCall); },
    timeToCall);
    lastTime = currTime + timeToCall;
    return id;
  };
}

module.exports = requestAnimationFrame;
},{}],3:[function(_dereq_,module,exports){
var $ = (window.jQuery);
var requestAnimationFrame = _dereq_('./raf');

function Range(options) {
  var $el = $('<div class="elessar-range">')
    .append('<span class="elessar-barlabel">');

  if(options.rangeClass) $el.addClass(options.rangeClass);

  if(!options.readonly) {
    if(!options.phantom) {
      $el.prepend('<div class="elessar-handle">').append('<div class="elessar-handle">');
    } else {
      $el.addClass('elessar-phantom');
    }
  } else {
    $el.addClass('elessar-readonly');
  }

  if(typeof options.label === 'function') {
    $el.on('changing', function(ev, range) {
      $el.find('.elessar-barlabel').text(options.label.call($el,range.map(options.parent.normalise)));
    });
  } else {
    $el.find('.elessar-barlabel').text(options.label);
  }

  var drawing = false, hasChanged = false;
  $el.range = [];

  $el.val = function(range, valOpts) {
    if(typeof range === 'undefined') {
      return $el.range;
    }

    valOpts  = $.extend({},{
      dontApplyDelta: false,
      trigger: true
    },valOpts || {});

    var next = options.parent.nextRange($el),
        prev = options.parent.prevRange($el),
        delta = range[1] - range[0];

    if(options.snap) {
      range = range.map(snap);
      delta = snap(delta);
    }
    if (next && next.val()[0] <= range[1] && prev && prev.val()[1] >= range[0]) {
      range[1] = next.val()[0];
      range[0] = prev.val()[1];
    }
    if (next && next.val()[0] < range[1]) {
      range[1] = next.val()[0];
      if(!valOpts.dontApplyDelta) range[0] = range[1] - delta;
    }
    if (prev && prev.val()[1] > range[0]) {
      range[0] = prev.val()[1];
      if(!valOpts.dontApplyDelta) range[1] = range[0] + delta;
    }
    if (range[1] >= 1) {
      range[1] = 1;
      if(!valOpts.dontApplyDelta) range[0] = 1 - delta;
    }
    if (range[0] <= 0) {
      range[0] = 0;
      if(!valOpts.dontApplyDelta) range[1] = delta;
    }

    if(options.minSize && range[1] - range[0] < options.minSize) {
      range[1] = range[0] + options.minSize;
    }

    if($el.range[0] === range[0] && $el.range[1] === range[1]) return $el;

    $el.range = range;
    if(valOpts.trigger) {
      $el.triggerHandler('changing', [range, $el]);
      hasChanged = true;
    }

    if (drawing) return $el;
    requestAnimationFrame(function() {
      drawing = false;
      $el.css({
        left: 100*range[0] + '%',
        minWidth: 100*(range[1] - range[0]) + '%'
      });
    });
    drawing = true;

    return $el;

    function snap(val) { return Math.round(val / options.snap) * options.snap; }
    function sign(x)   { return x ? x < 0 ? -1 : 1 : 0; }
  };

  if(options.value) $el.val(options.value);

  if(!options.readonly) {
    if(!options.phantom) {

      $el.on('mouseenter', function(ev) {
        options.parent.removePhantom();
      }).on('mousedown', function(ev) {
        hasChanged = false;
        if('which' in ev && ev.which !== 1) return;

        if ($(ev.target).is('.elessar-handle:first-child')) {
          $('body').addClass('elessar-resizing');
          $(document).on('mousemove',resizeLeft);
        } else if ($(ev.target).is('.elessar-handle:last-child')) {
          $('body').addClass('elessar-resizing');
          $(document).on('mousemove',resizeRight);
        } else {
          $('body').addClass('elessar-dragging');
          $(document).on('mousemove',drag);
        }

        var startLeft = $el.offset().left,
            startPosLeft = $el.position().left,
            mouseOffset = ev.clientX ? ev.clientX - $el.offset().left : 0,
            startWidth = $el.width(),
            parent = options.parent,
            parentOffset = parent.offset(),
            parentWidth = parent.width();

        $(document).on('mouseup', function() {
          if(hasChanged) $el.trigger('change', [$el.range, $el]);
          $(this).off('mouseup mousemove');
          $('body').removeClass('elessar-resizing elessar-dragging');
        });

        function drag(ev) {
          var left = ev.clientX - parentOffset.left - mouseOffset;

          if (left >= 0 && left <= parentWidth - $el.width()) {
            var rangeOffset = left / parentWidth - $el.range[0];
            $el.val([left / parentWidth, $el.range[1] + rangeOffset]);
          } else {
            mouseOffset = ev.clientX - $el.offset().left;
          }
        }

        function resizeRight(ev) {
          var width = ev.clientX - startLeft;

          if (width > parentWidth - startPosLeft) width = parentWidth - startPosLeft;
          if (width >= 10) {
            $el.val([$el.range[0], $el.range[0] + width / parentWidth], {dontApplyDelta: true});
          } else {
            $(document).trigger('mouseup');
            $el.find('.elessar-handle:first-child').trigger('mousedown');
          }
        }

        function resizeLeft(ev) {
          var left = ev.clientX - parentOffset.left - mouseOffset;
          var width = startPosLeft + startWidth - left;

          if (left < 0) {
            left = 0;
            width = startPosLeft + startWidth;
          }
          if (width >= 10) {
            $el.val([left / parentWidth, $el.range[1]], {dontApplyDelta: true});
          } else {
            $(document).trigger('mouseup');
            $el.find('.elessar-handle:last-child').trigger('mousedown');
          }
        }
      });
    } else {
      $el.on('mousedown', function(ev) {
        if(ev.which === 1) { // left mouse button
          var startX = ev.pageX;
          var newRange = options.parent.addRange($el.val());
          $el.remove();
          options.parent.trigger('addrange', [newRange.val(), newRange]);
          newRange.find('.elessar-handle:first-child').trigger('mousedown');
        }
      });
    }
  }

  return $el;
}

module.exports = Range;
},{"./raf":2}],4:[function(_dereq_,module,exports){
var $ = (window.jQuery);
var Range = _dereq_('./range');
var Indicator = _dereq_('./indicator');

RangeBar.defaults = {
  min: 0,
  max: 100,
  valueFormat: function(a) {return a;},
  valueParse: function(a) {return a;},
  maxRanges: Infinity,
  readonly: false,
  bgLabels: 0
};

function RangeBar(options) {
  var $base = $('<div class="elessar-rangebar">');
  options = $.extend({}, RangeBar.defaults, options);
  options.min = options.valueParse(options.min);
  options.max = options.valueParse(options.max);

  if(options.barClass) $base.addClass(options.barClass);

  function normaliseRaw(value) {
    return options.min + value * (options.max - options.min);
  }

  $base.normalise = function (value) {
    return options.valueFormat(normaliseRaw(value));
  };

  function abnormaliseRaw(value) {
    return (value - options.min)/(options.max - options.min);
  }

  $base.abnormalise = function (value) {
    return abnormaliseRaw(options.valueParse(value));
  };

  $base.ranges = [];

  $base.findGap = function(range) {
    var newIndex;
    $base.ranges.forEach(function($r, i) {
      if($r.val()[0] < range[0] && $r.val()[1] < range[1]) newIndex = i + 1;
    });

    return newIndex;
  };

  $base.insertRangeIndex = function(range, index, avoidList) {
    if(!avoidList) $base.ranges.splice(index, 0, range);

    if($base.ranges[index - 1]) {
      $base.ranges[index - 1].after(range);
    } else {
      $base.prepend(range);
    }
  };

  $base.addRange = function(range, data) {
    var $range = Range({
      parent: $base,
      snap: options.snap ? abnormaliseRaw(options.snap + options.min) : null,
      label: options.label,
      rangeClass: options.rangeClass,
      minSize: options.minSize ? abnormaliseRaw(options.minSize + options.min) : null,
      readonly: options.readonly
    });

    if (options.data) {
      $range.data(options.data.call($range, $base));
    }

    if (data) {
      $range.data(data);
    }

    $base.insertRangeIndex($range, $base.findGap(range));
    $range.val(range);

    $range.on('changing', function(ev, nrange, changed) {
      ev.stopPropagation();
      $base.trigger('changing', [$base.val(), changed]);
    }).on('change', function(ev, nrange, changed) {
      ev.stopPropagation();
      $base.trigger('change', [$base.val(), changed]);
    });
    return $range;
  };

  $base.prevRange = function(range) {
    var idx = range.index();
    if(idx >= 0) return $base.ranges[idx - 1];
  };

  $base.nextRange = function(range) {
    var idx = range.index();
    if(idx >= 0) return $base.ranges[range.is('.elessar-phantom') ? idx : idx + 1];
  };

  function setVal(ranges) {
    if($base.ranges.length > ranges.length) {
      for(var i = ranges.length, l = $base.ranges.length; i < l; ++i) {
        $base.ranges[i].remove();
      }
      $base.ranges.length = ranges.length;
    }

    ranges.forEach(function(range, i) {
      if($base.ranges[i]) {
        $base.ranges[i].val(range.map($base.abnormalise));
      } else {
        $base.addRange(range.map($base.abnormalise));
      }
    });

    return this;
  }

  $base.val = function(ranges) {
    if(typeof ranges === 'undefined') {
      return $base.ranges.map(function(range) {
        return range.val().map($base.normalise);
      });
    }

    if(!options.readonly) setVal(ranges);
    return this;
  };

  $base.removePhantom = function() {
    if($base.phantom) {
      $base.phantom.remove();
      $base.phantom = null;
    }
  };

  $base.calcGap = function(index) {
    var start = $base.ranges[index - 1] ? $base.ranges[index - 1].val()[1] : 0;
    var end = $base.ranges[index] ? $base.ranges[index].val()[0] : 1;
    return normaliseRaw(end) - normaliseRaw(start);
  };

  $base.addLabel = function(pos) {
    var cent = pos * 100, val = $base.normalise(pos);
    var $el = $('<span class="elessar-label">').css('left', cent+'%').text(val);
    if(1 - pos < 0.05) {
      $el.css({
        left: '',
        right: 0
      });
    }
    return $el.appendTo($base);
  };

  $base.on('mousemove', function(ev) {
    var w = options.minSize ? abnormaliseRaw(options.minSize + options.min) : 0.05;
    var val = (ev.pageX - $base.offset().left)/$base.width() - w/2;
    if(ev.target === ev.currentTarget && $base.ranges.length < options.maxRanges && !$('body').is('.elessar-dragging, .elessar-resizing') && !options.readonly) {
      if(!$base.phantom) $base.phantom = Range({
        parent: $base,
        snap: options.snap ? abnormaliseRaw(options.snap + options.min) : null,
        label: "+",
        minSize: options.minSize ? abnormaliseRaw(options.minSize + options.min) : null,
        rangeClass: options.rangeClass,
        phantom: true
      });
      var idx = $base.findGap([val,val + w]);

      if(!options.minSize || $base.calcGap(idx) >= options.minSize) {
        $base.insertRangeIndex($base.phantom, idx, true);
        $base.phantom.val([val,val + w], {trigger: false});
      }
    }
  }).on('mouseleave', $base.removePhantom);

  if(options.values) setVal(options.values);

  for(var i = 0; i < options.bgLabels; ++i) {
    $base.addLabel(i / options.bgLabels);
  }

  if(options.indicator) {
    var indicator = $base.indicator = new Indicator({
      parent: $base,
      indicatorClass: options.indicatorClass
    });
    indicator.val($base.abnormalise(options.indicator($base, indicator, function() {
      indicator.val($base.abnormalise(options.indicator($base, indicator)));
    })));
    $base.append(indicator);
  }

  return $base;
}

module.exports = RangeBar;

},{"./indicator":1,"./range":3}]},{},[4])
(4)
});