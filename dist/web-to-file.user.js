// ==UserScript==
// @name         web-to-file — pagina's opslaan als Markdown
// @namespace    https://github.com/spotmeisterfun/web-to-file
// @version      1.1.0
// @description  Sla een pagina en de onderliggende pagina's op als één Markdown-bestand, te gebruiken als referentiemateriaal voor Copilot.
// @author       spotmeisterfun
// @homepageURL  https://github.com/spotmeisterfun/web-to-file
// @supportURL   https://github.com/spotmeisterfun/web-to-file/issues
// @match        *://*/*
// @run-at       document-idle
// @noframes
// @grant        GM_registerMenuCommand
// @grant        GM_download
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

/* Gegenereerd door tools/build.mjs — pas src/ aan, niet dit bestand. */

(function () {
'use strict';

const BUILD_VERSION = "1.1.0";

/* =========================================================
 * vendor/turndown.js
 * ========================================================= */
const TurndownService = (function () {
  const module = { exports: {} };
  const exports = module.exports;
  const define = undefined;
/*
 * turndown@7.2.4 — lib/turndown.browser.umd.js
 * Gevendord door tools/vendor.mjs. Niet met de hand aanpassen.
 *
 * MIT License
 *
 * Copyright (c) 2017 Dom Christie
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.TurndownService = factory());
})(this, (function () { 'use strict';

  function extend(destination) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) destination[key] = source[key];
      }
    }
    return destination;
  }
  function repeat(character, count) {
    return Array(count + 1).join(character);
  }
  function trimLeadingNewlines(string) {
    return string.replace(/^\n*/, '');
  }
  function trimTrailingNewlines(string) {
    // avoid match-at-end regexp bottleneck, see #370
    var indexEnd = string.length;
    while (indexEnd > 0 && string[indexEnd - 1] === '\n') indexEnd--;
    return string.substring(0, indexEnd);
  }
  function trimNewlines(string) {
    return trimTrailingNewlines(trimLeadingNewlines(string));
  }
  var blockElements = ['ADDRESS', 'ARTICLE', 'ASIDE', 'AUDIO', 'BLOCKQUOTE', 'BODY', 'CANVAS', 'CENTER', 'DD', 'DIR', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'FRAMESET', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HGROUP', 'HR', 'HTML', 'ISINDEX', 'LI', 'MAIN', 'MENU', 'NAV', 'NOFRAMES', 'NOSCRIPT', 'OL', 'OUTPUT', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL'];
  function isBlock(node) {
    return is(node, blockElements);
  }
  var voidElements = ['AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 'INPUT', 'KEYGEN', 'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR'];
  function isVoid(node) {
    return is(node, voidElements);
  }
  function hasVoid(node) {
    return has(node, voidElements);
  }
  var meaningfulWhenBlankElements = ['A', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TH', 'TD', 'IFRAME', 'SCRIPT', 'AUDIO', 'VIDEO'];
  function isMeaningfulWhenBlank(node) {
    return is(node, meaningfulWhenBlankElements);
  }
  function hasMeaningfulWhenBlank(node) {
    return has(node, meaningfulWhenBlankElements);
  }
  function is(node, tagNames) {
    return tagNames.indexOf(node.nodeName) >= 0;
  }
  function has(node, tagNames) {
    return node.getElementsByTagName && tagNames.some(function (tagName) {
      return node.getElementsByTagName(tagName).length;
    });
  }
  var markdownEscapes = [[/\\/g, '\\\\'], [/\*/g, '\\*'], [/^-/g, '\\-'], [/^\+ /g, '\\+ '], [/^(=+)/g, '\\$1'], [/^(#{1,6}) /g, '\\$1 '], [/`/g, '\\`'], [/^~~~/g, '\\~~~'], [/\[/g, '\\['], [/\]/g, '\\]'], [/^>/g, '\\>'], [/_/g, '\\_'], [/^(\d+)\. /g, '$1\\. ']];
  function escapeMarkdown(string) {
    return markdownEscapes.reduce(function (accumulator, escape) {
      return accumulator.replace(escape[0], escape[1]);
    }, string);
  }

  var rules = {};
  rules.paragraph = {
    filter: 'p',
    replacement: function (content) {
      return '\n\n' + content + '\n\n';
    }
  };
  rules.lineBreak = {
    filter: 'br',
    replacement: function (content, node, options) {
      return options.br + '\n';
    }
  };
  rules.heading = {
    filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    replacement: function (content, node, options) {
      var hLevel = Number(node.nodeName.charAt(1));
      if (options.headingStyle === 'setext' && hLevel < 3) {
        var underline = repeat(hLevel === 1 ? '=' : '-', content.length);
        return '\n\n' + content + '\n' + underline + '\n\n';
      } else {
        return '\n\n' + repeat('#', hLevel) + ' ' + content + '\n\n';
      }
    }
  };
  rules.blockquote = {
    filter: 'blockquote',
    replacement: function (content) {
      content = trimNewlines(content).replace(/^/gm, '> ');
      return '\n\n' + content + '\n\n';
    }
  };
  rules.list = {
    filter: ['ul', 'ol'],
    replacement: function (content, node) {
      var parent = node.parentNode;
      if (parent.nodeName === 'LI' && parent.lastElementChild === node) {
        return '\n' + content;
      } else {
        return '\n\n' + content + '\n\n';
      }
    }
  };
  rules.listItem = {
    filter: 'li',
    replacement: function (content, node, options) {
      var prefix = options.bulletListMarker + '   ';
      var parent = node.parentNode;
      if (parent.nodeName === 'OL') {
        var start = parent.getAttribute('start');
        var index = Array.prototype.indexOf.call(parent.children, node);
        prefix = (start ? Number(start) + index : index + 1) + '.  ';
      }
      var isParagraph = /\n$/.test(content);
      content = trimNewlines(content) + (isParagraph ? '\n' : '');
      content = content.replace(/\n/gm, '\n' + ' '.repeat(prefix.length)); // indent
      return prefix + content + (node.nextSibling ? '\n' : '');
    }
  };
  rules.indentedCodeBlock = {
    filter: function (node, options) {
      return options.codeBlockStyle === 'indented' && node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
    },
    replacement: function (content, node, options) {
      return '\n\n    ' + node.firstChild.textContent.replace(/\n/g, '\n    ') + '\n\n';
    }
  };
  rules.fencedCodeBlock = {
    filter: function (node, options) {
      return options.codeBlockStyle === 'fenced' && node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
    },
    replacement: function (content, node, options) {
      var className = node.firstChild.getAttribute('class') || '';
      var language = (className.match(/language-(\S+)/) || [null, ''])[1];
      var code = node.firstChild.textContent;
      var fenceChar = options.fence.charAt(0);
      var fenceSize = 3;
      var fenceInCodeRegex = new RegExp('^' + fenceChar + '{3,}', 'gm');
      var match;
      while (match = fenceInCodeRegex.exec(code)) {
        if (match[0].length >= fenceSize) {
          fenceSize = match[0].length + 1;
        }
      }
      var fence = repeat(fenceChar, fenceSize);
      return '\n\n' + fence + language + '\n' + code.replace(/\n$/, '') + '\n' + fence + '\n\n';
    }
  };
  rules.horizontalRule = {
    filter: 'hr',
    replacement: function (content, node, options) {
      return '\n\n' + options.hr + '\n\n';
    }
  };
  rules.inlineLink = {
    filter: function (node, options) {
      return options.linkStyle === 'inlined' && node.nodeName === 'A' && node.getAttribute('href');
    },
    replacement: function (content, node) {
      var href = escapeLinkDestination(node.getAttribute('href'));
      var title = escapeLinkTitle(cleanAttribute(node.getAttribute('title')));
      var titlePart = title ? ' "' + title + '"' : '';
      return '[' + content + '](' + href + titlePart + ')';
    }
  };
  rules.referenceLink = {
    filter: function (node, options) {
      return options.linkStyle === 'referenced' && node.nodeName === 'A' && node.getAttribute('href');
    },
    replacement: function (content, node, options) {
      var href = escapeLinkDestination(node.getAttribute('href'));
      var title = cleanAttribute(node.getAttribute('title'));
      if (title) title = ' "' + escapeLinkTitle(title) + '"';
      var replacement;
      var reference;
      switch (options.linkReferenceStyle) {
        case 'collapsed':
          replacement = '[' + content + '][]';
          reference = '[' + content + ']: ' + href + title;
          break;
        case 'shortcut':
          replacement = '[' + content + ']';
          reference = '[' + content + ']: ' + href + title;
          break;
        default:
          var id = this.references.length + 1;
          replacement = '[' + content + '][' + id + ']';
          reference = '[' + id + ']: ' + href + title;
      }
      this.references.push(reference);
      return replacement;
    },
    references: [],
    append: function (options) {
      var references = '';
      if (this.references.length) {
        references = '\n\n' + this.references.join('\n') + '\n\n';
        this.references = []; // Reset references
      }
      return references;
    }
  };
  rules.emphasis = {
    filter: ['em', 'i'],
    replacement: function (content, node, options) {
      if (!content.trim()) return '';
      return options.emDelimiter + content + options.emDelimiter;
    }
  };
  rules.strong = {
    filter: ['strong', 'b'],
    replacement: function (content, node, options) {
      if (!content.trim()) return '';
      return options.strongDelimiter + content + options.strongDelimiter;
    }
  };
  rules.code = {
    filter: function (node) {
      var hasSiblings = node.previousSibling || node.nextSibling;
      var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings;
      return node.nodeName === 'CODE' && !isCodeBlock;
    },
    replacement: function (content) {
      if (!content) return '';
      content = content.replace(/\r?\n|\r/g, ' ');
      var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(content) ? ' ' : '';
      var delimiter = '`';
      var matches = content.match(/`+/gm) || [];
      while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + '`';
      return delimiter + extraSpace + content + extraSpace + delimiter;
    }
  };
  rules.image = {
    filter: 'img',
    replacement: function (content, node) {
      var alt = escapeMarkdown(cleanAttribute(node.getAttribute('alt')));
      var src = escapeLinkDestination(node.getAttribute('src') || '');
      var title = cleanAttribute(node.getAttribute('title'));
      var titlePart = title ? ' "' + escapeLinkTitle(title) + '"' : '';
      return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : '';
    }
  };
  function cleanAttribute(attribute) {
    return attribute ? attribute.replace(/(\n+\s*)+/g, '\n') : '';
  }
  function escapeLinkDestination(destination) {
    var escaped = destination.replace(/([<>()])/g, '\\$1');
    return escaped.indexOf(' ') >= 0 ? '<' + escaped + '>' : escaped;
  }
  function escapeLinkTitle(title) {
    return title.replace(/"/g, '\\"');
  }

  /**
   * Manages a collection of rules used to convert HTML to Markdown
   */

  function Rules(options) {
    this.options = options;
    this._keep = [];
    this._remove = [];
    this.blankRule = {
      replacement: options.blankReplacement
    };
    this.keepReplacement = options.keepReplacement;
    this.defaultRule = {
      replacement: options.defaultReplacement
    };
    this.array = [];
    for (var key in options.rules) this.array.push(options.rules[key]);
  }
  Rules.prototype = {
    add: function (key, rule) {
      this.array.unshift(rule);
    },
    keep: function (filter) {
      this._keep.unshift({
        filter: filter,
        replacement: this.keepReplacement
      });
    },
    remove: function (filter) {
      this._remove.unshift({
        filter: filter,
        replacement: function () {
          return '';
        }
      });
    },
    forNode: function (node) {
      if (node.isBlank) return this.blankRule;
      var rule;
      if (rule = findRule(this.array, node, this.options)) return rule;
      if (rule = findRule(this._keep, node, this.options)) return rule;
      if (rule = findRule(this._remove, node, this.options)) return rule;
      return this.defaultRule;
    },
    forEach: function (fn) {
      for (var i = 0; i < this.array.length; i++) fn(this.array[i], i);
    }
  };
  function findRule(rules, node, options) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (filterValue(rule, node, options)) return rule;
    }
    return undefined;
  }
  function filterValue(rule, node, options) {
    var filter = rule.filter;
    if (typeof filter === 'string') {
      if (filter === node.nodeName.toLowerCase()) return true;
    } else if (Array.isArray(filter)) {
      if (filter.indexOf(node.nodeName.toLowerCase()) > -1) return true;
    } else if (typeof filter === 'function') {
      if (filter.call(rule, node, options)) return true;
    } else {
      throw new TypeError('`filter` needs to be a string, array, or function');
    }
  }

  /**
   * The collapseWhitespace function is adapted from collapse-whitespace
   * by Luc Thevenard.
   *
   * The MIT License (MIT)
   *
   * Copyright (c) 2014 Luc Thevenard <lucthevenard@gmail.com>
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /**
   * collapseWhitespace(options) removes extraneous whitespace from an the given element.
   *
   * @param {Object} options
   */
  function collapseWhitespace(options) {
    var element = options.element;
    var isBlock = options.isBlock;
    var isVoid = options.isVoid;
    var isPre = options.isPre || function (node) {
      return node.nodeName === 'PRE';
    };
    if (!element.firstChild || isPre(element)) return;
    var prevText = null;
    var keepLeadingWs = false;
    var prev = null;
    var node = next(prev, element, isPre);
    while (node !== element) {
      if (node.nodeType === 3 || node.nodeType === 4) {
        // Node.TEXT_NODE or Node.CDATA_SECTION_NODE
        var text = node.data.replace(/[ \r\n\t]+/g, ' ');
        if ((!prevText || / $/.test(prevText.data)) && !keepLeadingWs && text[0] === ' ') {
          text = text.substr(1);
        }

        // `text` might be empty at this point.
        if (!text) {
          node = remove(node);
          continue;
        }
        node.data = text;
        prevText = node;
      } else if (node.nodeType === 1) {
        // Node.ELEMENT_NODE
        if (isBlock(node) || node.nodeName === 'BR') {
          if (prevText) {
            prevText.data = prevText.data.replace(/ $/, '');
          }
          prevText = null;
          keepLeadingWs = false;
        } else if (isVoid(node) || isPre(node)) {
          // Avoid trimming space around non-block, non-BR void elements and inline PRE.
          prevText = null;
          keepLeadingWs = true;
        } else if (prevText) {
          // Drop protection if set previously.
          keepLeadingWs = false;
        }
      } else {
        node = remove(node);
        continue;
      }
      var nextNode = next(prev, node, isPre);
      prev = node;
      node = nextNode;
    }
    if (prevText) {
      prevText.data = prevText.data.replace(/ $/, '');
      if (!prevText.data) {
        remove(prevText);
      }
    }
  }

  /**
   * remove(node) removes the given node from the DOM and returns the
   * next node in the sequence.
   *
   * @param {Node} node
   * @return {Node} node
   */
  function remove(node) {
    var next = node.nextSibling || node.parentNode;
    node.parentNode.removeChild(node);
    return next;
  }

  /**
   * next(prev, current, isPre) returns the next node in the sequence, given the
   * current and previous nodes.
   *
   * @param {Node} prev
   * @param {Node} current
   * @param {Function} isPre
   * @return {Node}
   */
  function next(prev, current, isPre) {
    if (prev && prev.parentNode === current || isPre(current)) {
      return current.nextSibling || current.parentNode;
    }
    return current.firstChild || current.nextSibling || current.parentNode;
  }

  /*
   * Set up window for Node.js
   */

  var root = typeof window !== 'undefined' ? window : {};

  /*
   * Parsing HTML strings
   */

  function canParseHTMLNatively() {
    var Parser = root.DOMParser;
    var canParse = false;

    // Adapted from https://gist.github.com/1129031
    // Firefox/Opera/IE throw errors on unsupported types
    try {
      // WebKit returns null on unsupported types
      if (new Parser().parseFromString('', 'text/html')) {
        canParse = true;
      }
    } catch (e) {}
    return canParse;
  }
  function createHTMLParser() {
    var Parser = function () {};
    {
      if (shouldUseActiveX()) {
        Parser.prototype.parseFromString = function (string) {
          var doc = new window.ActiveXObject('htmlfile');
          doc.designMode = 'on'; // disable on-page scripts
          doc.open();
          doc.write(string);
          doc.close();
          return doc;
        };
      } else {
        Parser.prototype.parseFromString = function (string) {
          var doc = document.implementation.createHTMLDocument('');
          doc.open();
          doc.write(string);
          doc.close();
          return doc;
        };
      }
    }
    return Parser;
  }
  function shouldUseActiveX() {
    var useActiveX = false;
    try {
      document.implementation.createHTMLDocument('').open();
    } catch (e) {
      if (root.ActiveXObject) useActiveX = true;
    }
    return useActiveX;
  }
  var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();

  function RootNode(input, options) {
    var root;
    if (typeof input === 'string') {
      var doc = htmlParser().parseFromString(
      // DOM parsers arrange elements in the <head> and <body>.
      // Wrapping in a custom element ensures elements are reliably arranged in
      // a single element.
      '<x-turndown id="turndown-root">' + input + '</x-turndown>', 'text/html');
      root = doc.getElementById('turndown-root');
    } else {
      root = input.cloneNode(true);
    }
    collapseWhitespace({
      element: root,
      isBlock: isBlock,
      isVoid: isVoid,
      isPre: options.preformattedCode ? isPreOrCode : null
    });
    return root;
  }
  var _htmlParser;
  function htmlParser() {
    _htmlParser = _htmlParser || new HTMLParser();
    return _htmlParser;
  }
  function isPreOrCode(node) {
    return node.nodeName === 'PRE' || node.nodeName === 'CODE';
  }

  function Node(node, options) {
    node.isBlock = isBlock(node);
    node.isCode = node.nodeName === 'CODE' || node.parentNode.isCode;
    node.isBlank = isBlank(node);
    node.flankingWhitespace = flankingWhitespace(node, options);
    return node;
  }
  function isBlank(node) {
    return !isVoid(node) && !isMeaningfulWhenBlank(node) && /^\s*$/i.test(node.textContent) && !hasVoid(node) && !hasMeaningfulWhenBlank(node);
  }
  function flankingWhitespace(node, options) {
    if (node.isBlock || options.preformattedCode && node.isCode) {
      return {
        leading: '',
        trailing: ''
      };
    }
    var edges = edgeWhitespace(node.textContent);

    // abandon leading ASCII WS if left-flanked by ASCII WS
    if (edges.leadingAscii && isFlankedByWhitespace('left', node, options)) {
      edges.leading = edges.leadingNonAscii;
    }

    // abandon trailing ASCII WS if right-flanked by ASCII WS
    if (edges.trailingAscii && isFlankedByWhitespace('right', node, options)) {
      edges.trailing = edges.trailingNonAscii;
    }
    return {
      leading: edges.leading,
      trailing: edges.trailing
    };
  }
  function edgeWhitespace(string) {
    var m = string.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
    return {
      leading: m[1],
      // whole string for whitespace-only strings
      leadingAscii: m[2],
      leadingNonAscii: m[3],
      trailing: m[4],
      // empty for whitespace-only strings
      trailingNonAscii: m[5],
      trailingAscii: m[6]
    };
  }
  function isFlankedByWhitespace(side, node, options) {
    var sibling;
    var regExp;
    var isFlanked;
    if (side === 'left') {
      sibling = node.previousSibling;
      regExp = / $/;
    } else {
      sibling = node.nextSibling;
      regExp = /^ /;
    }
    if (sibling) {
      if (sibling.nodeType === 3) {
        isFlanked = regExp.test(sibling.nodeValue);
      } else if (options.preformattedCode && sibling.nodeName === 'CODE') {
        isFlanked = false;
      } else if (sibling.nodeType === 1 && !isBlock(sibling)) {
        isFlanked = regExp.test(sibling.textContent);
      }
    }
    return isFlanked;
  }

  var reduce = Array.prototype.reduce;
  function TurndownService(options) {
    if (!(this instanceof TurndownService)) return new TurndownService(options);
    var defaults = {
      rules: rules,
      headingStyle: 'setext',
      hr: '* * *',
      bulletListMarker: '*',
      codeBlockStyle: 'indented',
      fence: '```',
      emDelimiter: '_',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
      br: '  ',
      preformattedCode: false,
      blankReplacement: function (content, node) {
        return node.isBlock ? '\n\n' : '';
      },
      keepReplacement: function (content, node) {
        return node.isBlock ? '\n\n' + node.outerHTML + '\n\n' : node.outerHTML;
      },
      defaultReplacement: function (content, node) {
        return node.isBlock ? '\n\n' + content + '\n\n' : content;
      }
    };
    this.options = extend({}, defaults, options);
    this.rules = new Rules(this.options);
  }
  TurndownService.prototype = {
    /**
     * The entry point for converting a string or DOM node to Markdown
     * @public
     * @param {String|HTMLElement} input The string or DOM node to convert
     * @returns A Markdown representation of the input
     * @type String
     */

    turndown: function (input) {
      if (!canConvert(input)) {
        throw new TypeError(input + ' is not a string, or an element/document/fragment node.');
      }
      if (input === '') return '';
      var output = process.call(this, new RootNode(input, this.options));
      return postProcess.call(this, output);
    },
    /**
     * Add one or more plugins
     * @public
     * @param {Function|Array} plugin The plugin or array of plugins to add
     * @returns The Turndown instance for chaining
     * @type Object
     */

    use: function (plugin) {
      if (Array.isArray(plugin)) {
        for (var i = 0; i < plugin.length; i++) this.use(plugin[i]);
      } else if (typeof plugin === 'function') {
        plugin(this);
      } else {
        throw new TypeError('plugin must be a Function or an Array of Functions');
      }
      return this;
    },
    /**
     * Adds a rule
     * @public
     * @param {String} key The unique key of the rule
     * @param {Object} rule The rule
     * @returns The Turndown instance for chaining
     * @type Object
     */

    addRule: function (key, rule) {
      this.rules.add(key, rule);
      return this;
    },
    /**
     * Keep a node (as HTML) that matches the filter
     * @public
     * @param {String|Array|Function} filter The unique key of the rule
     * @returns The Turndown instance for chaining
     * @type Object
     */

    keep: function (filter) {
      this.rules.keep(filter);
      return this;
    },
    /**
     * Remove a node that matches the filter
     * @public
     * @param {String|Array|Function} filter The unique key of the rule
     * @returns The Turndown instance for chaining
     * @type Object
     */

    remove: function (filter) {
      this.rules.remove(filter);
      return this;
    },
    /**
     * Escapes Markdown syntax
     * @public
     * @param {String} string The string to escape
     * @returns A string with Markdown syntax escaped
     * @type String
     */

    escape: function (string) {
      return escapeMarkdown(string);
    }
  };

  /**
   * Reduces a DOM node down to its Markdown string equivalent
   * @private
   * @param {HTMLElement} parentNode The node to convert
   * @returns A Markdown representation of the node
   * @type String
   */

  function process(parentNode) {
    var self = this;
    return reduce.call(parentNode.childNodes, function (output, node) {
      node = new Node(node, self.options);
      var replacement = '';
      if (node.nodeType === 3) {
        replacement = node.isCode ? node.nodeValue : self.escape(node.nodeValue);
      } else if (node.nodeType === 1) {
        replacement = replacementForNode.call(self, node);
      }
      return join(output, replacement);
    }, '');
  }

  /**
   * Appends strings as each rule requires and trims the output
   * @private
   * @param {String} output The conversion output
   * @returns A trimmed version of the ouput
   * @type String
   */

  function postProcess(output) {
    var self = this;
    this.rules.forEach(function (rule) {
      if (typeof rule.append === 'function') {
        output = join(output, rule.append(self.options));
      }
    });
    return output.replace(/^[\t\r\n]+/, '').replace(/[\t\r\n\s]+$/, '');
  }

  /**
   * Converts an element node to its Markdown equivalent
   * @private
   * @param {HTMLElement} node The node to convert
   * @returns A Markdown representation of the node
   * @type String
   */

  function replacementForNode(node) {
    var rule = this.rules.forNode(node);
    var content = process.call(this, node);
    var whitespace = node.flankingWhitespace;
    if (whitespace.leading || whitespace.trailing) content = content.trim();
    return whitespace.leading + rule.replacement(content, node, this.options) + whitespace.trailing;
  }

  /**
   * Joins replacement to the current output with appropriate number of new lines
   * @private
   * @param {String} output The current conversion output
   * @param {String} replacement The string to append to the output
   * @returns Joined output
   * @type String
   */

  function join(output, replacement) {
    var s1 = trimTrailingNewlines(output);
    var s2 = trimLeadingNewlines(replacement);
    var nls = Math.max(output.length - s1.length, replacement.length - s2.length);
    var separator = '\n\n'.substring(0, nls);
    return s1 + separator + s2;
  }

  /**
   * Determines whether an input can be converted
   * @private
   * @param {String|HTMLElement} input Describe this parameter
   * @returns Describe what it returns
   * @type String|Object|Array|Boolean|Number
   */

  function canConvert(input) {
    return input != null && (typeof input === 'string' || input.nodeType && (input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11));
  }

  return TurndownService;

}));

  return module.exports;
})();


/* =========================================================
 * vendor/turndown-plugin-gfm.js
 * ========================================================= */
/*
 * turndown-plugin-gfm@1.0.2 — dist/turndown-plugin-gfm.js
 * Gevendord door tools/vendor.mjs. Niet met de hand aanpassen.
 *
 * MIT License
 *
 * Copyright (c) 2017 Dom Christie
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
var turndownPluginGfm = (function (exports) {
'use strict';

var highlightRegExp = /highlight-(?:text|source)-([a-z0-9]+)/;

function highlightedCodeBlock (turndownService) {
  turndownService.addRule('highlightedCodeBlock', {
    filter: function (node) {
      var firstChild = node.firstChild;
      return (
        node.nodeName === 'DIV' &&
        highlightRegExp.test(node.className) &&
        firstChild &&
        firstChild.nodeName === 'PRE'
      )
    },
    replacement: function (content, node, options) {
      var className = node.className || '';
      var language = (className.match(highlightRegExp) || [null, ''])[1];

      return (
        '\n\n' + options.fence + language + '\n' +
        node.firstChild.textContent +
        '\n' + options.fence + '\n\n'
      )
    }
  });
}

function strikethrough (turndownService) {
  turndownService.addRule('strikethrough', {
    filter: ['del', 's', 'strike'],
    replacement: function (content) {
      return '~' + content + '~'
    }
  });
}

var indexOf = Array.prototype.indexOf;
var every = Array.prototype.every;
var rules = {};

rules.tableCell = {
  filter: ['th', 'td'],
  replacement: function (content, node) {
    return cell(content, node)
  }
};

rules.tableRow = {
  filter: 'tr',
  replacement: function (content, node) {
    var borderCells = '';
    var alignMap = { left: ':--', right: '--:', center: ':-:' };

    if (isHeadingRow(node)) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var border = '---';
        var align = (
          node.childNodes[i].getAttribute('align') || ''
        ).toLowerCase();

        if (align) border = alignMap[align] || border;

        borderCells += cell(border, node.childNodes[i]);
      }
    }
    return '\n' + content + (borderCells ? '\n' + borderCells : '')
  }
};

rules.table = {
  // Only convert tables with a heading row.
  // Tables with no heading row are kept using `keep` (see below).
  filter: function (node) {
    return node.nodeName === 'TABLE' && isHeadingRow(node.rows[0])
  },

  replacement: function (content) {
    // Ensure there are no blank lines
    content = content.replace('\n\n', '\n');
    return '\n\n' + content + '\n\n'
  }
};

rules.tableSection = {
  filter: ['thead', 'tbody', 'tfoot'],
  replacement: function (content) {
    return content
  }
};

// A tr is a heading row if:
// - the parent is a THEAD
// - or if its the first child of the TABLE or the first TBODY (possibly
//   following a blank THEAD)
// - and every cell is a TH
function isHeadingRow (tr) {
  var parentNode = tr.parentNode;
  return (
    parentNode.nodeName === 'THEAD' ||
    (
      parentNode.firstChild === tr &&
      (parentNode.nodeName === 'TABLE' || isFirstTbody(parentNode)) &&
      every.call(tr.childNodes, function (n) { return n.nodeName === 'TH' })
    )
  )
}

function isFirstTbody (element) {
  var previousSibling = element.previousSibling;
  return (
    element.nodeName === 'TBODY' && (
      !previousSibling ||
      (
        previousSibling.nodeName === 'THEAD' &&
        /^\s*$/i.test(previousSibling.textContent)
      )
    )
  )
}

function cell (content, node) {
  var index = indexOf.call(node.parentNode.childNodes, node);
  var prefix = ' ';
  if (index === 0) prefix = '| ';
  return prefix + content + ' |'
}

function tables (turndownService) {
  turndownService.keep(function (node) {
    return node.nodeName === 'TABLE' && !isHeadingRow(node.rows[0])
  });
  for (var key in rules) turndownService.addRule(key, rules[key]);
}

function taskListItems (turndownService) {
  turndownService.addRule('taskListItems', {
    filter: function (node) {
      return node.type === 'checkbox' && node.parentNode.nodeName === 'LI'
    },
    replacement: function (content, node) {
      return (node.checked ? '[x]' : '[ ]') + ' '
    }
  });
}

function gfm (turndownService) {
  turndownService.use([
    highlightedCodeBlock,
    strikethrough,
    tables,
    taskListItems
  ]);
}

exports.gfm = gfm;
exports.highlightedCodeBlock = highlightedCodeBlock;
exports.strikethrough = strikethrough;
exports.tables = tables;
exports.taskListItems = taskListItems;

return exports;

}({}));


/* =========================================================
 * src/util.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * util — losse hulpfuncties zonder DOM-afhankelijkheden.
 * ------------------------------------------------------------------ */

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'gclid', 'fbclid', 'mc_cid', 'mc_eid', 'ref', 'referrer',
  // Atlassian-specifiek
  'atlOrigin', 'src', 'focusedCommentId', 'focusedTaskId', 'atl_token', 'moved',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** GitHub-stijl anchor-slug, zodat de inhoudsopgave in Markdown-viewers werkt. */
function slugify(text) {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'sectie';
}

/** Zorgt dat een slug uniek is binnen `used`, met GitHub's -1/-2 achtervoegsels. */
function uniqueSlug(base, used) {
  let slug = base;
  let n = 0;
  while (used.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  used.add(slug);
  return slug;
}

/**
 * Maakt van een (mogelijk relatieve) href een absolute URL die we kunnen ophalen:
 * hash eraf, tracking-parameters eraf. Geeft null bij niet-http(s) of onparseerbaar.
 */
function normalizeUrl(raw, base) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  let url;
  try {
    url = base ? new URL(trimmed, base) : new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  url.hash = '';
  for (const param of TRACKING_PARAMS) url.searchParams.delete(param);
  return url.toString();
}

/**
 * Agressievere sleutel om dubbele pagina's te herkennen: dezelfde pagina met en
 * zonder slash, met andere parameter-volgorde of via /index.html telt één keer.
 */
function dedupeKey(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return String(rawUrl);
  }
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname
    .replace(/\/index\.(html?|php|aspx?)$/i, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/(.)\/$/, '$1');
  const params = [...url.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  url.search = '';
  for (const [key, value] of params) url.searchParams.append(key, value);
  return url.toString();
}

/** Voert `worker` uit over `items` met maximaal `limit` gelijktijdige aanroepen. */
async function pool(items, limit, worker) {
  const queue = [...items];
  const results = [];
  const runners = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    for (;;) {
      const index = items.length - queue.length;
      const item = queue.shift();
      if (item === undefined) return;
      results[index] = await worker(item, index);
    }
  });
  await Promise.all(runners);
  return results;
}

/** Probeert `fn` opnieuw met oplopende wachttijd. Gooit de laatste fout door. */
async function retry(fn, attempts = 2, baseDelay = 400) {
  let lastError;
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(baseDelay * 2 ** attempt);
    }
  }
  throw lastError;
}

function countWords(text) {
  const matches = String(text).match(/\S+/g);
  return matches ? matches.length : 0;
}

/** Ruwe schatting: ~4 tekens per token. Genoeg om te zien of iets in de context past. */
function estimateTokens(text) {
  return Math.round(String(text).length / 4);
}

function formatNumber(value) {
  return new Intl.NumberFormat('nl-NL').format(value);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Kort een URL in voor weergave in de lijst: alleen pad + query. */
function shortenUrl(rawUrl, maxLength = 72) {
  let text = rawUrl;
  try {
    const url = new URL(rawUrl);
    text = url.pathname + url.search;
  } catch { /* laat de ruwe waarde staan */ }
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

/**
 * Houdt de zwevende knop binnen het venster. De positie is de afstand van de
 * rechter- en onderrand tot de knop, zodat hij bij het verkleinen van het venster
 * in de hoek blijft hangen in plaats van eruit te schuiven.
 *
 * @param {{right: number, bottom: number}} position
 * @param {{width: number, height: number, size: number}} viewport
 */
function clampToViewport(position, viewport) {
  const margin = 8;
  const size = Number(viewport && viewport.size) > 0 ? Number(viewport.size) : 34;
  const width = Number(viewport && viewport.width) > 0 ? Number(viewport.width) : 0;
  const height = Number(viewport && viewport.height) > 0 ? Number(viewport.height) : 0;

  const fallback = 18;
  // Alleen echte getallen tellen: Number(null) is 0, en dat zou als een
  // geldige positie tegen de rand worden gelezen.
  const wanted = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
  const fit = (value, extent) => {
    const limit = Math.max(margin, extent - size - margin);
    return Math.min(Math.max(value, margin), limit);
  };

  return {
    right: fit(wanted(position && position.right), width),
    bottom: fit(wanted(position && position.bottom), height),
  };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayStamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}


/* =========================================================
 * src/settings.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * settings — persistente instellingen via GM_getValue/GM_setValue.
 *
 * Alles staat in één JSON-blob, met een sectie per domein zodat een
 * gekalibreerde content-selector per site bewaard blijft.
 * ------------------------------------------------------------------ */

const SETTINGS_KEY = 'web-to-file:settings';
const memoryFallback = { data: null };

function hasGmStorage() {
  return typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
}

function readSettings() {
  if (!hasGmStorage()) return memoryFallback.data || (memoryFallback.data = {});
  try {
    const raw = GM_getValue(SETTINGS_KEY, '{}');
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettings(settings) {
  if (!hasGmStorage()) {
    memoryFallback.data = settings;
    return;
  }
  try {
    GM_setValue(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* opslag vol of geweigerd: instellingen zijn niet essentieel */ }
}

/** Laatst gebruikte opties in het paneel, zodat je ze niet opnieuw invult. */
function getLastOptions() {
  const settings = readSettings();
  return settings.lastOptions && typeof settings.lastOptions === 'object' ? settings.lastOptions : {};
}

function setLastOptions(options) {
  const settings = readSettings();
  settings.lastOptions = options;
  writeSettings(settings);
}

function getDomainConfig(host) {
  const settings = readSettings();
  const domains = settings.domains || {};
  return domains[host] && typeof domains[host] === 'object' ? domains[host] : {};
}

function patchDomainConfig(host, patch) {
  const settings = readSettings();
  settings.domains = settings.domains || {};
  settings.domains[host] = Object.assign({}, settings.domains[host], patch);
  writeSettings(settings);
}

function getGlobalFlag(name, fallback) {
  const settings = readSettings();
  return name in settings ? settings[name] : fallback;
}

function setGlobalFlag(name, value) {
  const settings = readSettings();
  settings[name] = value;
  writeSettings(settings);
}


/* =========================================================
 * src/scope.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * scope — bepalen welke links wel en niet meegenomen worden.
 * ------------------------------------------------------------------ */

/** Bestandstypen die geen HTML-pagina zijn en dus nooit gecrawld worden. */
const SKIP_EXTENSIONS = /\.(pdf|zip|gz|tgz|rar|7z|exe|msi|dmg|png|jpe?g|gif|svg|webp|ico|bmp|tiff?|mp[34]|m4[av]|wav|ogg|avi|mov|mkv|webm|css|js|mjs|json|xml|rss|atom|csv|tsv|xlsx?|xlsm|docx?|pptx?|odt|ods|odp|ttf|woff2?|eot|txt|patch|diff)$/i;

/**
 * Paden die op vrijwel elke wiki bestaan maar geen inhoud bevatten (of iets
 * muteren). Bewust conservatief: alleen dingen die nooit referentiemateriaal zijn.
 */
const SKIP_PATTERNS = [
  /\/(login|logout|signin|signout|sign-in|sign-out|register|password)\b/i,
  /\/(admin|setup|install)\//i,
  /[?&]action=(edit|delete|diff|history|raw|watch|unwatch|login|logout)\b/i,
  /[?&]do=(edit|revisions|diff|login|media)\b/i,
  /\/pages\/(diffpagesbyversion|viewpreviousversions|copypage|editpage|createpage|templates)/i,
  /\/(plugins|rest|s|_next|static|assets|images|attachments|download|exports?)\//i,
  /\/(spacedirectory|dashboard\.action|users\/viewuserprofile|display\/~)/i,
  /\?.*\bprint(able)?=(yes|true|1)\b/i,
  /\/(feed|rss|atom|sitemap)(\.\w+)?$/i,
  /\/(tag|tags|label|labels|search)\//i,
];

/**
 * Raadt een verstandige URL-prefix voor de crawl: de eerste padsegmenten van de
 * startpagina. Op Confluence Cloud levert dat /wiki/, op Server /display/.
 * De gebruiker kan dit in het paneel aanpassen.
 */
function guessScopePrefix(startUrl) {
  let url;
  try {
    url = new URL(startUrl);
  } catch {
    return startUrl;
  }
  const segments = url.pathname.split('/').filter(Boolean);
  if (!segments.length) return `${url.origin}/`;
  return `${url.origin}/${segments[0]}/`;
}

/**
 * Bouwt de filterfunctie voor één crawl.
 *
 * @param {object} options
 * @param {string} options.prefix       URL's moeten hiermee beginnen ('' = heel domein).
 * @param {string} [options.pattern]    Optionele extra regex waaraan de URL moet voldoen.
 * @param {string} [options.exclude]    Optionele regex; treffers worden uitgesloten.
 * @param {boolean} [options.sameOriginOnly=true]
 * @param {string} options.startUrl
 * @returns {(url: string) => {ok: boolean, reason?: string}}
 */
function createScopeFilter(options) {
  const { prefix = '', pattern = '', exclude = '', sameOriginOnly = true, startUrl } = options;
  const origin = (() => {
    try { return new URL(startUrl).origin; } catch { return null; }
  })();
  const patternRe = pattern ? new RegExp(pattern, 'i') : null;
  const excludeRe = exclude ? new RegExp(exclude, 'i') : null;

  return function allow(rawUrl) {
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return { ok: false, reason: 'ongeldige URL' };
    }
    if (sameOriginOnly && origin && url.origin !== origin) return { ok: false, reason: 'ander domein' };
    if (prefix && !rawUrl.startsWith(prefix)) return { ok: false, reason: 'buiten de prefix' };
    if (SKIP_EXTENSIONS.test(url.pathname)) return { ok: false, reason: 'geen HTML-bestand' };
    for (const skip of SKIP_PATTERNS) {
      if (skip.test(url.pathname + url.search)) return { ok: false, reason: 'systeempagina' };
    }
    if (patternRe && !patternRe.test(rawUrl)) return { ok: false, reason: 'matcht patroon niet' };
    if (excludeRe && excludeRe.test(rawUrl)) return { ok: false, reason: 'uitgesloten door patroon' };
    return { ok: true };
  };
}

/**
 * Haalt alle bruikbare links uit een element (normaal de hoofdinhoud, niet de
 * hele pagina — daarmee vallen navigatie, footer en zijbalk automatisch weg).
 *
 * @returns {Array<{url: string, text: string}>} genormaliseerd en ontdubbeld
 */
function collectLinks(root, baseUrl) {
  if (!root) return [];
  const seen = new Set();
  const links = [];
  for (const anchor of root.querySelectorAll('a[href]')) {
    const rel = (anchor.getAttribute('rel') || '').toLowerCase().split(/\s+/);
    if (rel.includes('nofollow')) continue;
    const url = normalizeUrl(anchor.getAttribute('href'), baseUrl);
    if (!url) continue;
    const key = dedupeKey(url);
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ url, text: (anchor.textContent || '').trim().replace(/\s+/g, ' ') });
  }
  return links;
}


/* =========================================================
 * src/fetcher.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * fetcher — HTML ophalen mét de ingelogde sessie van de gebruiker.
 *
 * Omdat een userscript in de context van de pagina zelf draait, gaan cookies
 * (inclusief SameSite=Strict en SSO) automatisch mee bij een same-origin fetch.
 * Voor andere hosts valt het script terug op GM_xmlhttpRequest.
 * ------------------------------------------------------------------ */

const FETCH_TIMEOUT_MS = 20000;
const HTML_CONTENT_TYPE = /(text\/html|application\/xhtml)/i;

function isSameOrigin(url) {
  try {
    return new URL(url).origin === location.origin;
  } catch {
    return false;
  }
}

function parseContentType(headerBlob) {
  const match = /^content-type:\s*(.+)$/im.exec(headerBlob || '');
  return match ? match[1].trim() : '';
}

/**
 * Ziet de respons eruit als een inlogpagina in plaats van de gevraagde inhoud?
 * Een inlog-achtig pad telt alleen als we er naartoe zijn omgeleid — anders
 * zou een echte pagina onder bijvoorbeeld /docs/auth/ onterecht sneuvelen.
 */
function looksLikeLoginPage(html, requestedUrl, finalUrl) {
  const redirected = dedupeKey(requestedUrl) !== dedupeKey(finalUrl);
  if (redirected && /\/(login|signin|sign-in|auth|adfs|saml|oauth2)\b/i.test(finalUrl)) return true;
  const head = html.slice(0, 4000);
  return /<input[^>]+type=["']?password/i.test(head) && !/<article|<main/i.test(head);
}

function fetchViaGm(url) {
  if (typeof GM_xmlhttpRequest !== 'function') {
    return Promise.reject(new Error('GM_xmlhttpRequest is niet beschikbaar'));
  }
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      timeout: FETCH_TIMEOUT_MS,
      headers: { Accept: 'text/html,application/xhtml+xml' },
      onload: (response) => resolve({
        status: response.status,
        html: response.responseText || '',
        finalUrl: response.finalUrl || url,
        contentType: parseContentType(response.responseHeaders),
      }),
      onerror: () => reject(new Error('netwerkfout')),
      ontimeout: () => reject(new Error('timeout na 20s')),
      onabort: () => reject(new Error('afgebroken')),
    });
  });
}

async function fetchViaWindow(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      credentials: 'include',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    return {
      status: response.status,
      html: await response.text(),
      finalUrl: response.url || url,
      contentType: response.headers.get('content-type') || '',
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Haalt één pagina op. Gooit nooit; geeft altijd een resultaatobject terug.
 *
 * @returns {Promise<{ok: boolean, url: string, finalUrl?: string, html?: string,
 *                    bytes?: number, reason?: string}>}
 */
async function fetchHtml(url) {
  try {
    const response = await retry(
      () => (isSameOrigin(url) ? fetchViaWindow(url) : fetchViaGm(url)),
      2,
      500,
    );
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, url, reason: `HTTP ${response.status}` };
    }
    if (response.contentType && !HTML_CONTENT_TYPE.test(response.contentType)) {
      return { ok: false, url, reason: `geen HTML (${response.contentType.split(';')[0]})` };
    }
    if (!response.html || !response.html.trim()) {
      return { ok: false, url, reason: 'lege respons' };
    }
    if (looksLikeLoginPage(response.html, url, response.finalUrl || url)) {
      return { ok: false, url, reason: 'inlogpagina — sessie verlopen?' };
    }
    return {
      ok: true,
      url,
      finalUrl: response.finalUrl,
      html: response.html,
      bytes: response.html.length,
    };
  } catch (error) {
    return { ok: false, url, reason: error && error.message ? error.message : 'onbekende fout' };
  }
}

/**
 * Parseert HTML naar een los document en zet er een <base> in, zodat relatieve
 * links en afbeeldingen als absolute URL uitgelezen kunnen worden.
 */
function parseHtml(html, url) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const head = doc.head || doc.documentElement;
  const existing = doc.querySelector('base[href]');
  if (existing) {
    const resolved = normalizeUrl(existing.getAttribute('href'), url);
    if (resolved) existing.setAttribute('href', resolved);
    else existing.remove();
  }
  if (!doc.querySelector('base[href]')) {
    const base = doc.createElement('base');
    base.setAttribute('href', url);
    head.insertBefore(base, head.firstChild);
  }
  return doc;
}


/* =========================================================
 * src/extract.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * extract — de hoofdinhoud van een pagina vinden en opschonen.
 *
 * Volgorde: gekalibreerde selector per domein → bekende selectors →
 * dichtheids-heuristiek → body zonder navigatie.
 * ------------------------------------------------------------------ */

/** Containers die op de meeste wiki's en documentatiesites de inhoud bevatten. */
const CONTENT_SELECTORS = [
  '[data-testid="ak-renderer-document"]',   // Confluence Cloud
  '#main-content',                          // Confluence Server/DC
  '.wiki-content',                          // Confluence Server/DC
  '.mw-parser-output',                      // MediaWiki
  '.markdown-body',                         // GitHub-achtig
  '.theme-doc-markdown',                    // Docusaurus
  '.md-content__inner',                     // MkDocs Material
  '[role="main"] article',
  'article[role="article"]',
  'main article',
  'article',
  'main',
  '[role="main"]',
  '#content',
  '.content',
];

const NEGATIVE_CLASS = /(^|[\s_-])(nav|navigation|menu|sidebar|side-bar|footer|header|masthead|breadcrumb|comment|share|social|related|promo|banner|advert|cookie|toolbar|pagination|widget|meta|search|skip|screen-reader|sr-only|visually-hidden|announce|feedback)([\s_-]|$)/i;
const POSITIVE_CLASS = /(^|[\s_-])(content|article|main|body|post|page|entry|wiki|doc|docs|markdown|prose|text|storytext)([\s_-]|$)/i;

/** Wordt altijd verwijderd: nooit inhoud, vaak wel veel ruis. */
const HARD_STRIP = [
  'script', 'style', 'noscript', 'template', 'svg', 'canvas', 'iframe', 'object', 'embed',
  'form', 'button', 'input', 'select', 'textarea', 'link', 'meta', 'base', 'audio', 'video',
  '[aria-hidden="true"]', '[hidden]', '[role="navigation"]', '[role="banner"]',
  '[role="contentinfo"]', '[role="search"]', '[role="complementary"]', '[role="alert"]',
  '[role="dialog"]', '[role="tooltip"]', 'nav', 'aside', 'footer', '[data-web-to-file]',
].join(', ');

/** Wordt verwijderd zolang het blok klein is (anders is het waarschijnlijk inhoud). */
const SOFT_STRIP = [
  '.sidebar', '.toc', '#toc', '.table-of-contents', '.toc-macro', '.breadcrumbs', '.breadcrumb',
  '.cookie', '.cookie-banner', '.share', '.sharing', '.social', '.comments', '#comments',
  '.comment-list', '.pagination', '.prev-next', '.edit-link', '.skip-link', '.sr-only',
  '.screen-reader-text', '.visually-hidden', '.announcement', '.feedback', '.rate-page',
  '.page-metadata', '.expand-icon', '.aui-icon', '.confluence-information-macro-icon',
  '.hidden', '.docs-feedback', '.theme-doc-toc-desktop', '.md-sidebar',
].join(', ');

const SOFT_STRIP_MAX_CHARS = 1500;

function visibleTextLength(element) {
  return (element.textContent || '').replace(/\s+/g, ' ').trim().length;
}

function linkDensity(element, textLength) {
  if (!textLength) return 1;
  let linkLength = 0;
  for (const anchor of element.querySelectorAll('a')) {
    linkLength += (anchor.textContent || '').trim().length;
  }
  return Math.min(1, linkLength / textLength);
}

function classSignal(element) {
  const haystack = `${element.className || ''} ${element.id || ''}`;
  if (NEGATIVE_CLASS.test(haystack)) return 0.4;
  if (POSITIVE_CLASS.test(haystack)) return 1.3;
  return 1;
}

/** Scoort een kandidaat-container op tekstvolume tegenover link-dichtheid. */
function scoreCandidate(element) {
  const textLength = visibleTextLength(element);
  if (textLength < 200) return 0;
  const density = linkDensity(element, textLength);
  if (density > 0.5) return 0;
  const blocks = element.querySelectorAll('p, li, pre, td, h2, h3, h4').length;
  return (textLength * (1 - density) + blocks * 25) * classSignal(element);
}

/** Zoekt via de dichtheids-heuristiek de beste container in het document. */
function findByDensity(doc) {
  const body = doc.body;
  if (!body) return null;
  const candidates = body.querySelectorAll('main, article, section, div, td');
  let best = null;
  let bestScore = 0;
  let inspected = 0;
  for (const candidate of candidates) {
    if (inspected > 3000) break;
    inspected += 1;
    const score = scoreCandidate(candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/**
 * Bepaalt het element met de hoofdinhoud.
 * @returns {{root: Element, via: string}}
 */
function findContentRoot(doc, url) {
  const host = (() => {
    try { return new URL(url).host; } catch { return ''; }
  })();

  const calibrated = getDomainConfig(host).contentSelector;
  if (calibrated) {
    try {
      const element = doc.querySelector(calibrated);
      if (element && visibleTextLength(element) > 50) return { root: element, via: 'gekalibreerd' };
    } catch { /* ongeldige bewaarde selector: gewoon doorgaan */ }
  }

  // Een bekende selector is een sterk signaal; die vertrouwen we ook bij een
  // korte pagina, waar de heuristiek nog niets zou vinden.
  for (const selector of CONTENT_SELECTORS) {
    const element = doc.querySelector(selector);
    if (element && visibleTextLength(element) > 100) return { root: element, via: selector };
  }

  const dense = findByDensity(doc);
  if (dense) return { root: dense, via: 'heuristiek' };

  return { root: doc.body || doc.documentElement, via: 'hele pagina' };
}

/**
 * Maakt een kopie van de inhoud zonder navigatie, scripts en andere ruis.
 * Het origineel blijft ongemoeid, zodat de echte pagina niet verandert.
 */
function cleanContent(root) {
  const clone = root.cloneNode(true);

  for (const element of clone.querySelectorAll(HARD_STRIP)) element.remove();

  for (const element of clone.querySelectorAll(SOFT_STRIP)) {
    if (visibleTextLength(element) < SOFT_STRIP_MAX_CHARS) element.remove();
  }

  // Kopregels met alleen een ankerlink ("¶", "#") leveren lege links op.
  for (const anchor of clone.querySelectorAll('a')) {
    const text = (anchor.textContent || '').trim();
    if (!text && !anchor.querySelector('img')) anchor.remove();
  }

  return clone;
}

/** Haalt titel, canonieke URL en wijzigingsdatum uit het document. */
function extractPageMeta(doc, url, contentRoot) {
  const pick = (selector, attribute) => {
    const element = doc.querySelector(selector);
    if (!element) return '';
    const value = attribute ? element.getAttribute(attribute) : element.textContent;
    return (value || '').trim().replace(/\s+/g, ' ');
  };

  const contentHeading = contentRoot && contentRoot.querySelector('h1')
    ? (contentRoot.querySelector('h1').textContent || '').trim().replace(/\s+/g, ' ')
    : '';

  const title = contentHeading
    || pick('meta[property="og:title"]', 'content')
    || pick('h1')
    || cleanDocumentTitle(doc.title || '')
    || shortenUrl(url);

  const canonicalRaw = pick('link[rel="canonical"]', 'href');
  const canonical = canonicalRaw ? normalizeUrl(canonicalRaw, url) : null;

  const lastModified = pick('meta[property="article:modified_time"]', 'content')
    || pick('meta[name="last-modified"]', 'content')
    || pick('.page-metadata time[datetime]', 'datetime')
    || pick('time[datetime]', 'datetime');

  const breadcrumbs = [...doc.querySelectorAll('nav.breadcrumbs a, #breadcrumbs a, .breadcrumb a, ol.breadcrumb a, [aria-label="breadcrumb"] a')]
    .map((anchor) => (anchor.textContent || '').trim())
    .filter(Boolean);

  return { title, canonical, lastModified, breadcrumbs };
}

/** Haalt een sitenaam-achtervoegsel van de <title> af ("Pagina - Ruimte - Confluence"). */
function cleanDocumentTitle(title) {
  const cleaned = title.trim().replace(/\s+/g, ' ');
  const match = /^(.*?)\s+[-|–—]\s+([^-|–—]{1,40})$/.exec(cleaned);
  if (match && match[1].trim().length >= 3) return match[1].trim();
  return cleaned;
}

/**
 * Bouwt een redelijk stabiele CSS-selector voor een element. Gebruikt voor de
 * kalibratiemodus, waarin de gebruiker de content-container zelf aanwijst.
 */
function cssPathFor(element) {
  if (!element || element.nodeType !== 1) return '';
  const parts = [];
  let node = element;
  while (node && node.nodeType === 1 && node.localName !== 'html') {
    if (node.id && /^[A-Za-z][\w-]*$/.test(node.id)) {
      parts.unshift(`#${node.id}`);
      break;
    }
    let selector = node.localName;
    const stableClasses = [...(node.classList || [])]
      .filter((name) => /^[A-Za-z][\w-]*$/.test(name) && !/\d{3,}|active|selected|open|hover|focus|current/i.test(name));
    if (stableClasses.length) selector += `.${stableClasses.slice(0, 2).join('.')}`;
    const parent = node.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter((child) => child.localName === node.localName);
      if (siblings.length > 1) selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    }
    parts.unshift(selector);
    node = node.parentElement;
  }
  return parts.join(' > ');
}


/* =========================================================
 * src/markdown.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * markdown — opgeschoonde HTML omzetten naar Markdown met Turndown.
 * ------------------------------------------------------------------ */

const PANEL_LABELS = [
  [/(^|[\s_-])(warning|danger|error|caution)([\s_-]|$)/i, 'Waarschuwing'],
  [/(^|[\s_-])(note|information|info)([\s_-]|$)/i, 'Info'],
  [/(^|[\s_-])(tip|success|hint)([\s_-]|$)/i, 'Tip'],
];

/** Maakt alle links en afbeeldingen absoluut, zodat ze buiten de site werken. */
function absolutizeUrls(root) {
  for (const anchor of root.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href');
    if (/^(javascript|data):/i.test(href || '')) {
      anchor.removeAttribute('href');
      continue;
    }
    if (anchor.href) anchor.setAttribute('href', anchor.href);
  }
  for (const image of root.querySelectorAll('img')) {
    const lazy = image.getAttribute('data-src') || image.getAttribute('data-original');
    if (lazy && !image.getAttribute('src')) image.setAttribute('src', lazy);
    if (image.src) image.setAttribute('src', image.src);
    image.removeAttribute('srcset');
  }
}

/**
 * Verlaagt alle kopregels met `by` niveaus, zodat de koppen van een pagina onder
 * de `##` van die pagina in het gecombineerde document hangen.
 */
function demoteHeadings(root, by) {
  if (!by) return;
  const doc = root.ownerDocument;
  for (const heading of [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')]) {
    const level = Number(heading.localName.slice(1));
    const target = Math.min(6, level + by);
    if (target === level) continue;
    const replacement = doc.createElement(`h${target}`);
    replacement.innerHTML = heading.innerHTML;
    heading.replaceWith(replacement);
  }
}

function panelLabel(className) {
  for (const [pattern, label] of PANEL_LABELS) {
    if (pattern.test(className)) return label;
  }
  return 'Notitie';
}

function createTurndown(options) {
  const { imageMode = 'link' } = options || {};
  const service = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '_',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    br: '  ',
  });

  service.use(turndownPluginGfm.gfm);
  service.remove(['script', 'style', 'noscript', 'template', 'form']);

  service.addRule('webToFileImages', {
    filter: 'img',
    replacement: (_content, node) => {
      if (imageMode === 'skip') return '';
      const alt = (node.getAttribute('alt') || '').trim();
      const src = node.getAttribute('src') || '';
      if (imageMode === 'text' || !src) return alt ? `[afbeelding: ${alt}]` : '[afbeelding]';
      return `![${alt}](${src})`;
    },
  });

  // Confluence-panels en admonitions worden blockquotes met een label.
  service.addRule('webToFilePanels', {
    filter: (node) => node.nodeType === 1
      && /confluence-information-macro|admonition|aui-message/i.test(node.className || ''),
    replacement: (content, node) => {
      const body = content.trim();
      if (!body) return '';
      const quoted = body.split('\n').map((line) => `> ${line}`.trimEnd()).join('\n');
      return `\n\n> **${panelLabel(node.className || '')}**\n>\n${quoted}\n\n`;
    },
  });

  // Confluence-codeblokken hebben geen <code>, maar wel een brush-parameter.
  service.addRule('webToFileConfluenceCode', {
    filter: (node) => node.nodeName === 'PRE'
      && (/syntaxhighlighter-pre/i.test(node.className || '') || node.hasAttribute('data-syntaxhighlighter-params')),
    replacement: (_content, node) => {
      const params = node.getAttribute('data-syntaxhighlighter-params') || '';
      const match = /brush:\s*([a-z0-9+#-]+)/i.exec(params);
      const language = match ? match[1].toLowerCase() : '';
      const code = (node.textContent || '').replace(/\n+$/, '');
      return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    },
  });

  service.addRule('webToFileDetails', {
    filter: ['details'],
    replacement: (content) => `\n\n${content.trim()}\n\n`,
  });

  return service;
}

/** Ruimt overtollige witruimte op die uit de HTML-conversie komt. */
function tidyMarkdown(markdown) {
  return markdown
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    // Turndown vult "-" aan tot vier tekens ("-   item"); één spatie leest beter
    // en houdt geneste lijsten intact, want die zijn vier spaties ingesprongen.
    .replace(/^(\s*)([-*+])\s{2,}(?=\S)/gm, '$1$2 ')
    .replace(/^(\s*)(\d+\.)\s{2,}(?=\S)/gm, '$1$2 ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '');
}

const turndownCache = new Map();

function getTurndown(imageMode) {
  if (!turndownCache.has(imageMode)) turndownCache.set(imageMode, createTurndown({ imageMode }));
  return turndownCache.get(imageMode);
}

function normalizeHeadingText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Maakt een schone kopie van de inhoud: zonder navigatie en ruis, met absolute
 * URL's. Zowel de Markdown als de te volgen links komen hieruit, zodat menu- en
 * footerlinks nooit in de crawl belanden — ook niet als de hoofdinhoud niet
 * herkend werd en er op de hele pagina teruggevallen is.
 */
function prepareContent(root) {
  const cleaned = cleanContent(root);
  absolutizeUrls(cleaned);
  return cleaned;
}

/**
 * Zet opgeschoonde inhoud om naar Markdown. Let op: dit past `cleaned` aan, dus
 * verzamel eventuele links ervóór.
 *
 * @param {Element} cleaned  resultaat van prepareContent
 * @param {object} options   { imageMode, demoteBy, title }
 */
function renderContent(cleaned, options) {
  const { imageMode = 'link', demoteBy = 2, title = '' } = options || {};

  // De titel wordt de sectiekop in het gecombineerde document; laat de eigen
  // kopregel van de pagina weg als die er precies hetzelfde staat.
  const firstHeading = cleaned.querySelector('h1, h2');
  const isTitleHeading = Boolean(firstHeading) && Boolean(title)
    && normalizeHeadingText(firstHeading.textContent) === normalizeHeadingText(title);
  if (isTitleHeading) firstHeading.remove();

  // Die weggehaalde H1 stáát al als "## N. Titel" boven de sectie, dus hoeft de
  // rest maar één niveau te zakken. Blijft de H1 staan, dan twee, zodat hij
  // netjes onder de sectiekop hangt.
  demoteHeadings(cleaned, isTitleHeading ? Math.max(1, demoteBy - 1) : demoteBy);
  return tidyMarkdown(getTurndown(imageMode).turndown(cleaned.innerHTML));
}

/** Gemakkelijke variant voor één pagina in één keer. */
function pageToMarkdown(root, options) {
  return renderContent(prepareContent(root), options);
}


/* =========================================================
 * src/discover.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * discover — de crawl in twee fasen.
 *
 * Fase 1 (verkennen) haalt alleen de niveaus op die nódig zijn om de lijst te
 * kunnen maken: voor diepte 1 is dat alleen de startpagina. Je ziet dus eerst
 * hoeveel pagina's het worden en pas na jouw bevestiging worden de rest
 * opgehaald (fase 2).
 * ------------------------------------------------------------------ */

const DEFAULT_CONCURRENCY = 3;
const POLITE_DELAY_MS = 120;

function sameLiveUrl(url) {
  return dedupeKey(url) === dedupeKey(location.href);
}

/**
 * @param {object} options
 * @param {string}   options.startUrl
 * @param {number}   options.depth            0 = alleen deze pagina
 * @param {Function} options.allow            scope-filter uit createScopeFilter
 * @param {number}   options.maxPages
 * @param {string}   options.imageMode
 * @param {boolean}  [options.includeAllLinks] ook links buiten de hoofdinhoud volgen
 * @param {Function} [options.onProgress]     ({done, total, phase, url})
 * @param {Function} [options.isCancelled]
 * @param {Function} [options.loadPage]        alleen voor tests: eigen loader
 */
function createCrawler(options) {
  const {
    startUrl,
    depth,
    allow,
    maxPages,
    imageMode = 'link',
    includeAllLinks = false,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress = () => {},
    isCancelled = () => false,
    loadPage = null,
  } = options;

  const nodes = [];
  const byKey = new Map();
  const failures = [];
  const state = { truncated: false };

  function addNode(node) {
    const key = dedupeKey(node.url);
    if (byKey.has(key)) return null;
    if (nodes.length >= maxPages) {
      state.truncated = true;
      return null;
    }
    byKey.set(key, node);
    nodes.push(node);
    return node;
  }

  async function loadDocument(node) {
    if (loadPage) return loadPage(node);
    if (sameLiveUrl(node.url)) {
      return {
        ok: true,
        doc: document,
        finalUrl: location.href,
        bytes: document.documentElement.outerHTML.length,
      };
    }
    const response = await fetchHtml(node.url);
    if (!response.ok) return response;
    const finalUrl = response.finalUrl || node.url;
    return { ok: true, doc: parseHtml(response.html, finalUrl), finalUrl, bytes: response.bytes };
  }

  /** Haalt één pagina op, zet hem om naar Markdown en onthoudt de links. */
  async function analyse(node) {
    if (node.fetched || node.excluded) return;
    const response = await loadDocument(node);
    if (!response.ok) {
      node.failed = true;
      node.reason = response.reason;
      failures.push({ url: node.url, depth: node.depth, reason: response.reason });
      return;
    }

    const { root, via } = findContentRoot(response.doc, node.url);
    const meta = extractPageMeta(response.doc, node.url, root);

    // Dezelfde pagina onder een andere URL: één keer opnemen.
    if (meta.canonical) {
      const canonicalKey = dedupeKey(meta.canonical);
      const owner = byKey.get(canonicalKey);
      if (owner && owner !== node) {
        node.excluded = true;
        node.reason = 'dubbel (zelfde canonieke URL)';
        return;
      }
      if (!owner) byKey.set(canonicalKey, node);
    }

    node.title = meta.title || node.title || shortenUrl(node.url);
    node.lastModified = meta.lastModified || '';
    node.breadcrumbs = meta.breadcrumbs || [];
    node.finalUrl = response.finalUrl;
    node.contentVia = via;
    node.bytes = response.bytes;
    const cleaned = prepareContent(root);
    node.links = collectLinks(includeAllLinks ? (response.doc.body || root) : cleaned, response.finalUrl);
    node.markdown = renderContent(cleaned, { imageMode, demoteBy: 2, title: node.title });
    node.chars = node.markdown.length;
    node.words = countWords(node.markdown);
    node.fetched = true;
  }

  async function runBatch(batch, phase) {
    let done = 0;
    await pool(batch, concurrency, async (node) => {
      if (isCancelled()) return;
      if (POLITE_DELAY_MS) await sleep(Math.random() * POLITE_DELAY_MS);
      await analyse(node);
      done += 1;
      onProgress({ phase, done, total: batch.length, url: node.url, title: node.title });
    });
  }

  /**
   * Fase 1: bouwt de lijst met pagina's. Haalt de niveaus 0..depth-1 op om de
   * links te kunnen lezen; het diepste niveau blijft nog ongeladen.
   */
  async function discover() {
    addNode({ url: startUrl, depth: 0, parentUrl: null, title: '', fetched: false });

    for (let level = 0; level < Math.max(depth, 1); level += 1) {
      if (isCancelled()) break;
      const batch = nodes.filter((node) => node.depth === level && !node.fetched && !node.excluded);
      if (!batch.length) break;
      await runBatch(batch, 'verkennen');

      if (level >= depth) break;
      for (const node of batch) {
        for (const link of node.links || []) {
          if (!allow(link.url).ok) continue;
          addNode({
            url: link.url,
            depth: level + 1,
            parentUrl: node.url,
            title: link.text || '',
            fetched: false,
          });
        }
      }
    }

    return { nodes: includedNodes(), failures, truncated: state.truncated };
  }

  /** Fase 2: haalt de nog niet geladen pagina's op uit de selectie. */
  async function collect(selected) {
    const pending = selected.filter((node) => !node.fetched && !node.excluded);
    if (pending.length) await runBatch(pending, 'ophalen');
    const selectedKeys = new Set(selected.map((node) => dedupeKey(node.url)));
    return {
      pages: selected.filter((node) => node.fetched && !node.excluded),
      failures: failures.filter((failure) => selectedKeys.has(dedupeKey(failure.url))),
    };
  }

  function includedNodes() {
    return nodes.filter((node) => !node.excluded);
  }

  return {
    discover,
    collect,
    get nodes() { return includedNodes(); },
    get failures() { return failures; },
    get truncated() { return state.truncated; },
  };
}


/* =========================================================
 * src/assemble.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * assemble — de losse pagina's samenvoegen tot één Markdown-document.
 * ------------------------------------------------------------------ */

const SCRIPT_VERSION = (typeof GM_info !== 'undefined' && GM_info && GM_info.script && GM_info.script.version)
  ? GM_info.script.version
  : (typeof BUILD_VERSION !== 'undefined' ? BUILD_VERSION : 'dev');

/** Vierkante haken in een titel zouden de link in de inhoudsopgave breken. */
function escapeLinkText(text) {
  return String(text).replace(/([[\]])/g, '\\$1');
}

function yamlString(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildFrontmatter(fields) {
  const lines = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${typeof value === 'number' ? value : yamlString(value)}`);
  return ['---', ...lines, '---'].join('\n');
}

/**
 * Bouwt het complete document.
 *
 * @param {object} input
 * @param {string} input.startUrl
 * @param {number} input.depth
 * @param {Array}  input.pages     genummerde nodes met .title, .url, .markdown
 * @param {Array}  input.failures  [{url, reason}]
 * @param {string} [input.documentTitle]
 * @returns {{markdown: string, stats: object}}
 */
function assembleDocument(input) {
  const { startUrl, depth, pages, failures = [], documentTitle } = input;
  const title = documentTitle || (pages[0] && pages[0].title) || shortenUrl(startUrl);
  const generated = new Date().toISOString();

  const usedSlugs = new Set();
  const sections = pages.map((page, index) => {
    const number = index + 1;
    const heading = `${number}. ${page.title}`;
    const slug = uniqueSlug(slugify(heading), usedSlugs);
    return { page, number, heading, slug };
  });

  const body = sections.map(({ page, heading }) => {
    const metaLines = [`Bron: <${page.finalUrl || page.url}>`];
    if (page.lastModified) metaLines.push(`Laatst gewijzigd: ${page.lastModified}`);
    const content = (page.markdown || '').trim() || '_Deze pagina bevatte geen leesbare inhoud._';
    return [`## ${heading}`, '', metaLines.join('  \n'), '', content].join('\n');
  });

  const toc = sections.map(({ number, page, slug }) =>
    `${number}. [${escapeLinkText(page.title)}](#${slug}) — \`${shortenUrl(page.url, 90)}\``);

  const allText = body.join('\n');
  const stats = {
    pages: pages.length,
    chars: allText.length,
    words: countWords(allText),
    tokens: estimateTokens(allText),
    failures: failures.length,
  };

  const header = [
    buildFrontmatter({
      title,
      start_url: startUrl,
      crawl_depth: depth,
      pages: pages.length,
      words: stats.words,
      generated,
      generator: `web-to-file ${SCRIPT_VERSION}`,
    }),
    '',
    `# ${title}`,
    '',
    `Referentiemateriaal, opgehaald uit <${startUrl}> op ${todayStamp()}.`,
    `${formatNumber(stats.pages)} pagina's · diepte ${depth} · ${formatNumber(stats.words)} woorden · ≈${formatNumber(stats.tokens)} tokens`,
    '',
    '> Gegenereerd met web-to-file. Verwijs hiernaar in Copilot Chat met',
    '> `#file:<bestandsnaam>` of zet het bestand in je repository.',
    '',
    "## Inhoud",
    '',
    ...toc,
  ].join('\n');

  const parts = [header, ...body];

  if (failures.length) {
    parts.push([
      '## Niet opgehaald',
      '',
      'Deze pagina\'s zijn overgeslagen; controleer ze eventueel zelf in de browser.',
      '',
      ...failures.map((failure) => `- <${failure.url}> — ${failure.reason}`),
    ].join('\n'));
  }

  return { markdown: `${parts.join('\n\n---\n\n')}\n`, stats };
}

/** Bestandsnaam op basis van host, titel en datum. */
function buildFilename(startUrl, title) {
  let host = 'pagina';
  try {
    host = new URL(startUrl).host.replace(/^www\./, '').replace(/[^\w.-]/g, '');
  } catch { /* val terug op de standaardnaam */ }
  const slug = slugify(title).slice(0, 60) || 'export';
  return `${host}-${slug}-${todayStamp()}.md`.replace(/-{2,}/g, '-');
}

/**
 * Splitst een document in delen van ongeveer `maxWords` woorden, op sectiegrens.
 * @returns {Array<{name: string, content: string}>}
 */
function splitDocument(markdown, filename, maxWords) {
  if (!maxWords || countWords(markdown) <= maxWords) {
    return [{ name: filename, content: markdown }];
  }
  const chunks = markdown.split(/\n\n---\n\n/);
  const head = chunks.shift();
  const groups = [];
  let current = [];
  let currentWords = 0;
  for (const chunk of chunks) {
    const words = countWords(chunk);
    if (current.length && currentWords + words > maxWords) {
      groups.push(current);
      current = [];
      currentWords = 0;
    }
    current.push(chunk);
    currentWords += words;
  }
  if (current.length) groups.push(current);

  const base = filename.replace(/\.md$/i, '');
  return groups.map((group, index) => ({
    name: `${base}-deel${index + 1}.md`,
    content: `${[
      head,
      `_Deel ${index + 1} van ${groups.length}._`,
      ...group,
    ].join('\n\n---\n\n')}\n`,
  }));
}


/* =========================================================
 * src/save.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * save — het resultaat op schijf of op het klembord zetten.
 * ------------------------------------------------------------------ */

function createBlobUrl(text) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  return URL.createObjectURL(blob);
}

/**
 * Downloadt het bestand via een blob-link. Dit werkt ook op sites met een
 * strikte CSP, omdat de blob in de pagina zelf wordt gemaakt.
 */
function saveTextFile(filename, text) {
  const url = createBlobUrl(text);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    return { ok: true, via: 'browser' };
  } catch (error) {
    return { ok: false, reason: error && error.message ? error.message : 'download geweigerd' };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

/** Alternatief via Tampermonkey zelf, voor als de gewone download niets doet. */
function saveViaGm(filename, text) {
  if (typeof GM_download !== 'function') {
    return { ok: false, reason: 'GM_download is niet beschikbaar' };
  }
  const url = createBlobUrl(text);
  try {
    GM_download({
      url,
      name: filename,
      saveAs: true,
      onerror: () => { /* de gebruiker kan altijd nog kopiëren */ },
    });
    return { ok: true, via: 'GM_download' };
  } catch (error) {
    return { ok: false, reason: error && error.message ? error.message : 'GM_download mislukt' };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}

function copyToClipboard(text) {
  if (typeof GM_setClipboard === 'function') {
    GM_setClipboard(text, 'text');
    return { ok: true, via: 'GM_setClipboard' };
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
    return { ok: true, via: 'navigator.clipboard' };
  }
  return { ok: false, reason: 'geen klembord beschikbaar' };
}


/* =========================================================
 * src/ui.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * ui — het paneel, in een shadow DOM zodat de opmaak van de site niets
 * kan breken en het paneel zelf niet in de export terechtkomt.
 * ------------------------------------------------------------------ */

const PANEL_CSS = `
:host { all: initial; }
* { box-sizing: border-box; }
.overlay {
  position: fixed; inset: 0; z-index: 2147483647;
  background: rgba(15, 23, 42, .55);
  display: flex; align-items: center; justify-content: center; padding: 24px;
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #0f172a;
}
.panel {
  background: #fff; color: #0f172a; width: 100%; max-width: 760px;
  max-height: 86vh; display: flex; flex-direction: column;
  border-radius: 12px; box-shadow: 0 24px 64px rgba(0,0,0,.35); overflow: hidden;
}
header { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #e2e8f0; }
header .title { font-weight: 700; font-size: 15px; }
header .step { color: #64748b; font-size: 12px; margin-left: auto; }
header button.close { border: 0; background: none; font-size: 22px; line-height: 1; cursor: pointer; color: #64748b; padding: 0 4px; }
.body { padding: 18px; overflow: auto; flex: 1; }
footer { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
footer .status { color: #475569; font-size: 12px; margin-right: auto; }
.actions { display: flex; gap: 10px; }
.hint { color: #64748b; font-size: 12px; }
.field { display: block; margin-bottom: 14px; }
.field > span.label { display: block; font-weight: 600; margin-bottom: 5px; }
.field > span.hint { display: block; color: #64748b; font-size: 12px; margin-top: 4px; }
input[type=text], input[type=number], select, textarea {
  width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 7px;
  font: inherit; background: #fff; color: inherit;
}
textarea { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; min-height: 190px; resize: vertical; }
button.action {
  border: 1px solid #cbd5e1; background: #fff; color: #0f172a; padding: 8px 14px;
  border-radius: 7px; font: inherit; font-weight: 600; cursor: pointer;
}
button.action:hover { background: #f1f5f9; }
button.action.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
button.action.primary:hover { background: #1d4ed8; }
button.action:disabled { opacity: .5; cursor: not-allowed; }
button.link { border: 0; background: none; color: #2563eb; cursor: pointer; font: inherit; padding: 0; text-decoration: underline; }
.depth { display: flex; gap: 8px; flex-wrap: wrap; }
.depth button { flex: 1 1 120px; text-align: left; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; cursor: pointer; font: inherit; }
.depth button.selected { border-color: #2563eb; background: #eff6ff; box-shadow: inset 0 0 0 1px #2563eb; }
.depth button strong { display: block; }
.depth button span { color: #64748b; font-size: 12px; }
details.more { margin-top: 6px; }
details.more summary { cursor: pointer; color: #2563eb; font-weight: 600; margin-bottom: 12px; }
.summary { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
.summary strong { font-size: 16px; }
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 8px; font-size: 12px; color: #475569; }
.group { margin-bottom: 14px; }
.group > .group-title { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; margin: 12px 0 6px; }
.row { display: flex; gap: 9px; align-items: flex-start; padding: 5px 6px; border-radius: 6px; }
.row:hover { background: #f1f5f9; }
.row input { margin-top: 3px; flex: none; }
.row .text { min-width: 0; }
.row .name { display: block; font-weight: 500; word-break: break-word; }
.row .path { display: block; color: #64748b; font-size: 12px; word-break: break-all; }
.row .fail { display: block; }
.progress { height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden; margin: 12px 0; }
.progress > div { height: 100%; background: #2563eb; width: 0; transition: width .2s; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; color: #475569; }
.stats { display: flex; gap: 18px; flex-wrap: wrap; margin-bottom: 14px; }
.stats div span { display: block; color: #64748b; font-size: 12px; }
.stats div strong { font-size: 17px; }
.warn { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
.fail { color: #b91c1c; font-size: 12px; }
@media (prefers-color-scheme: dark) {
  .overlay { color: #e2e8f0; }
  .hint { color: #94a3b8; }
  .panel { background: #0f172a; color: #e2e8f0; }
  header, footer { border-color: #1e293b; }
  footer { background: #131c31; }
  header .step, footer .status, .row .path, .group > .group-title, .field > span.hint, .mono, .stats div span { color: #94a3b8; }
  input[type=text], input[type=number], select, textarea { background: #1e293b; border-color: #334155; color: #e2e8f0; }
  button.action { background: #1e293b; border-color: #334155; color: #e2e8f0; }
  button.action:hover { background: #263449; }
  button.action.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
  .depth button { background: #1e293b; border-color: #334155; color: #e2e8f0; }
  .depth button.selected { background: #1e3a8a; }
  .depth button span { color: #94a3b8; }
  .row:hover { background: #1e293b; }
  .summary { background: #172554; border-color: #1e40af; }
  .progress { background: #1e293b; }
  .warn { background: #422006; border-color: #a16207; }
}
`;

const DEPTH_CHOICES = [
  { value: 0, label: 'Alleen deze pagina', hint: '1 pagina, geen links volgen' },
  { value: 1, label: '1 laag diep', hint: 'deze pagina + alles waar hij naar linkt' },
  { value: 2, label: '2 lagen diep', hint: 'ook de links op die pagina\'s' },
  { value: 3, label: '3 lagen diep', hint: 'kan snel veel pagina\'s worden' },
];

/** Maakt een element met attributen, tekst en kinderen. Bewust zonder innerHTML:
 * titels en URL's komen van externe sites en gaan er altijd als tekst in. */
function el(tag, props, children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of [].concat(children || [])) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function createPanel() {
  const host = el('div', { 'data-web-to-file': 'panel' });
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.append(el('style', { text: PANEL_CSS }));

  const stepLabel = el('span', { class: 'step' });
  const body = el('div', { class: 'body' });
  const status = el('span', { class: 'status' });
  const actions = el('div', { class: 'actions' });
  const footer = el('footer', {}, [status, actions]);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') close();
  };
  const close = () => {
    window.removeEventListener('keydown', onKeyDown, true);
    host.remove();
  };
  window.addEventListener('keydown', onKeyDown, true);
  const overlay = el('div', { class: 'overlay' }, [
    el('div', { class: 'panel', role: 'dialog', 'aria-label': 'web-to-file' }, [
      el('header', {}, [
        el('span', { class: 'title', text: 'web-to-file' }),
        stepLabel,
        el('button', { class: 'close', title: 'Sluiten', onclick: close, text: '×' }),
      ]),
      body,
      footer,
    ]),
  ]);
  shadow.append(overlay);
  document.body.append(host);

  return {
    host,
    close,
    setStep: (text) => { stepLabel.textContent = text; },
    setStatus: (text) => { status.textContent = text; },
    render(content, buttons) {
      body.replaceChildren(...[].concat(content).filter(Boolean));
      actions.replaceChildren(...[].concat(buttons || []).filter(Boolean));
      body.scrollTop = 0;
    },
  };
}


/* =========================================================
 * src/calibrate.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * calibrate — de gebruiker wijst zelf het element met de hoofdinhoud aan.
 *
 * Voor interne wiki's die niet met de standaard-selectors werken is dit de
 * betrouwbaarste route: één keer aanwijzen, daarna onthoudt het script de
 * selector voor dat domein.
 * ------------------------------------------------------------------ */

const CALIBRATE_BANNER_CSS = `
position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
background: #2563eb; color: #fff; padding: 10px 16px;
font: 600 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,.3);
`;

const CALIBRATE_OUTLINE_CSS = `
position: fixed; z-index: 2147483646; pointer-events: none;
border: 2px solid #2563eb; background: rgba(37, 99, 235, .12);
border-radius: 3px; transition: all .05s linear;
`;

function startCalibration() {
  const host = el('div', { 'data-web-to-file': 'calibrate' });
  host.style.cssText = 'all: initial;';
  const shadow = host.attachShadow({ mode: 'open' });
  const banner = el('div', { text: 'Klik op het blok met de hoofdinhoud. Escape om te stoppen.' });
  banner.style.cssText = CALIBRATE_BANNER_CSS;
  const outline = el('div', {});
  outline.style.cssText = CALIBRATE_OUTLINE_CSS;
  shadow.append(banner, outline);
  document.body.append(host);

  let current = null;

  const targetAt = (event) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (!element || element.closest('[data-web-to-file]')) return null;
    return element;
  };

  const onMove = (event) => {
    const element = targetAt(event);
    if (!element) return;
    current = element;
    const box = element.getBoundingClientRect();
    outline.style.top = `${box.top}px`;
    outline.style.left = `${box.left}px`;
    outline.style.width = `${box.width}px`;
    outline.style.height = `${box.height}px`;
    banner.textContent = `${element.localName}${element.id ? `#${element.id}` : ''} — klik om te kiezen, Escape om te stoppen`;
  };

  const stop = () => {
    document.removeEventListener('mousemove', onMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    host.remove();
  };

  const onClick = (event) => {
    const element = targetAt(event) || current;
    event.preventDefault();
    event.stopPropagation();
    if (!element) return;
    const selector = cssPathFor(element);
    const domain = location.host;
    let matched = null;
    try {
      matched = document.querySelector(selector);
    } catch { /* selector niet bruikbaar */ }
    stop();
    if (!selector || matched !== element) {
      alert('Kon voor dit element geen betrouwbare selector maken. Probeer het omliggende blok.');
      return;
    }
    patchDomainConfig(domain, { contentSelector: selector });
    alert(`Opgeslagen voor ${domain}:\n\n${selector}\n\nDit blok wordt vanaf nu als hoofdinhoud gebruikt.`);
  };

  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      stop();
    }
  };

  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
}

function clearCalibration() {
  patchDomainConfig(location.host, { contentSelector: null });
  alert(`De gekalibreerde selector voor ${location.host} is gewist.`);
}


/* =========================================================
 * src/flow.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * flow — de vier stappen van de wizard aan elkaar geknoopt.
 * ------------------------------------------------------------------ */

const TOKEN_WARNING_THRESHOLD = 250000;
const SPLIT_CHOICES = [
  { value: 0, label: 'Niet splitsen (één bestand)' },
  { value: 25000, label: 'Splitsen per ~25.000 woorden' },
  { value: 50000, label: 'Splitsen per ~50.000 woorden' },
];

/** Alleen deze velden worden bewaard; de URL is altijd die van de huidige pagina. */
const REMEMBERED_OPTIONS = ['depth', 'maxPages', 'imageMode', 'includeAllLinks', 'exclude', 'splitWords'];

function rememberOptions(options) {
  const keep = {};
  for (const key of REMEMBERED_OPTIONS) keep[key] = options[key];
  setLastOptions(keep);
}

function defaultOptions() {
  const saved = getLastOptions();
  return {
    url: location.href,
    depth: typeof saved.depth === 'number' ? saved.depth : 1,
    prefix: guessScopePrefix(location.href),
    maxPages: saved.maxPages || 100,
    imageMode: saved.imageMode || 'link',
    includeAllLinks: Boolean(saved.includeAllLinks),
    exclude: saved.exclude || '',
    splitWords: saved.splitWords || 0,
  };
}

function openWizard() {
  const panel = createPanel();
  const options = defaultOptions();
  const state = { cancelled: false, crawler: null, document: null };

  /* ---------------- stap 1: instellingen ---------------- */

  function renderStart() {
    state.cancelled = false;
    panel.setStep('Stap 1 van 3 — instellen');
    panel.setStatus('');

    const urlInput = el('input', { type: 'text', value: options.url, spellcheck: 'false' });
    const prefixInput = el('input', { type: 'text', value: options.prefix, spellcheck: 'false' });
    const maxInput = el('input', { type: 'number', min: '1', max: '2000', value: String(options.maxPages) });
    const excludeInput = el('input', { type: 'text', value: options.exclude, spellcheck: 'false', placeholder: 'bijv. /archief/|oude-versie' });
    const allLinksInput = el('input', { type: 'checkbox' });
    allLinksInput.checked = options.includeAllLinks;
    const imageSelect = el('select', {}, [
      el('option', { value: 'link', text: 'Als Markdown-link behouden' }),
      el('option', { value: 'text', text: 'Vervangen door [afbeelding: alt]' }),
      el('option', { value: 'skip', text: 'Weglaten' }),
    ]);
    imageSelect.value = options.imageMode;

    // Bewaart wat er al ingevuld is, zodat het niet verdwijnt bij opnieuw tekenen.
    const captureInputs = () => {
      options.url = urlInput.value.trim() || options.url;
      options.prefix = prefixInput.value.trim();
      options.maxPages = Math.max(1, Number(maxInput.value) || 100);
      options.imageMode = imageSelect.value;
      options.includeAllLinks = allLinksInput.checked;
      options.exclude = excludeInput.value.trim();
    };

    const depthButtons = DEPTH_CHOICES.map((choice) => el('button', {
      class: choice.value === options.depth ? 'selected' : '',
      type: 'button',
      onclick: () => {
        captureInputs();
        options.depth = choice.value;
        renderStart();
      },
    }, [
      el('strong', { text: choice.label }),
      el('span', { text: choice.hint }),
    ]));

    const start = () => {
      const url = normalizeUrl(urlInput.value.trim());
      if (!url) {
        panel.setStatus('Dat is geen geldige http(s)-URL.');
        return;
      }
      Object.assign(options, {
        url,
        prefix: prefixInput.value.trim(),
        maxPages: Math.max(1, Number(maxInput.value) || 100),
        imageMode: imageSelect.value,
        includeAllLinks: allLinksInput.checked,
        exclude: excludeInput.value.trim(),
      });
      rememberOptions(options);
      runDiscover();
    };

    panel.render([
      el('label', { class: 'field' }, [
        el('span', { class: 'label', text: 'Pagina om op te slaan' }),
        urlInput,
      ]),
      el('div', { class: 'field' }, [
        el('span', { class: 'label', text: 'Hoe diep?' }),
        el('div', { class: 'depth' }, depthButtons),
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'label', text: "Alleen pagina's waarvan de URL hiermee begint" }),
        prefixInput,
        el('span', { class: 'hint', text: 'Leeghalen om het hele domein toe te staan. Navigatie, footer en zijbalk worden altijd al genegeerd.' }),
      ]),
      isButtonEnabled() ? null : el('div', { class: 'hint' }, [
        'Sneller starten? ',
        el('button', {
          class: 'link',
          type: 'button',
          text: 'zet het knopje op deze site',
          onclick: () => {
            captureInputs();
            setButtonEnabled(true);
            panel.setStatus('Het knopje staat nu rechtsonder op deze site.');
            renderStart();
          },
        }),
        ' — dan hoef je hier niet meer via het Tampermonkey-menu te komen.',
      ]),
      el('details', { class: 'more' }, [
        el('summary', { text: 'Meer opties' }),
        el('label', { class: 'field' }, [
          el('span', { class: 'label', text: "Maximum aantal pagina's" }),
          maxInput,
        ]),
        el('label', { class: 'field' }, [
          el('span', { class: 'label', text: 'Afbeeldingen' }),
          imageSelect,
        ]),
        el('label', { class: 'field' }, [
          el('span', { class: 'label', text: 'URL-patroon uitsluiten (regex, optioneel)' }),
          excludeInput,
        ]),
        el('label', { class: 'field' }, [
          el('span', { class: 'label' }, [allLinksInput, ' Ook links buiten de hoofdinhoud volgen']),
          el('span', { class: 'hint', text: 'Standaard uit: dan blijft de lijst schoon, omdat menu- en footerlinks wegvallen.' }),
        ]),
      ]),
    ], [
      el('button', { class: 'action primary', type: 'button', text: 'Verkennen →', onclick: start }),
    ]);
  }

  /* ---------------- stap 2: verkennen ---------------- */

  function renderProgress(title, note) {
    const bar = el('div', {});
    const line = el('div', { class: 'mono', text: 'Bezig…' });
    panel.render([
      el('div', { class: 'field' }, [el('span', { class: 'label', text: title })]),
      note ? el('div', { class: 'hint', text: note }) : null,
      el('div', { class: 'progress' }, [bar]),
      line,
    ], [
      el('button', {
        class: 'action',
        type: 'button',
        text: 'Stoppen',
        onclick: () => { state.cancelled = true; panel.setStatus('Gestopt.'); renderStart(); },
      }),
    ]);
    state.progress = {
      update: ({ done, total, url }) => {
        bar.style.width = total ? `${Math.round((done / total) * 100)}%` : '0%';
        panel.setStatus(`${done} van ${total}`);
        line.textContent = shortenUrl(url, 90);
      },
    };
    return state.progress;
  }

  async function runDiscover() {
    panel.setStep('Stap 2 van 3 — verkennen');
    const requestNote = options.depth <= 1
      ? 'Alleen de startpagina wordt nu opgehaald om de lijst te maken.'
      : `Om ${options.depth} lagen te kunnen tonen worden nu ook de tussenliggende pagina's opgehaald.`;
    renderProgress('Pagina\'s zoeken…', requestNote);

    const allow = createScopeFilter({
      startUrl: options.url,
      prefix: options.prefix,
      exclude: options.exclude,
      sameOriginOnly: !options.prefix,
    });

    state.crawler = createCrawler({
      startUrl: options.url,
      depth: options.depth,
      allow,
      maxPages: options.maxPages,
      imageMode: options.imageMode,
      includeAllLinks: options.includeAllLinks,
      onProgress: (info) => { if (state.progress) state.progress.update(info); },
      isCancelled: () => state.cancelled,
    });

    try {
      await state.crawler.discover();
    } catch (error) {
      panel.setStatus(`Verkennen mislukt: ${error && error.message ? error.message : error}`);
      return;
    }
    if (state.cancelled) return;
    renderReview();
  }

  /* ---------------- stap 3: overzicht en selectie ---------------- */

  function renderReview() {
    panel.setStep('Stap 3 van 3 — controleren');
    panel.setStatus('');
    state.progress = null;
    const nodes = state.crawler.nodes;
    for (const node of nodes) {
      if (node.selected === undefined) node.selected = !node.failed;
    }

    const byDepth = new Map();
    for (const node of nodes) {
      if (!byDepth.has(node.depth)) byDepth.set(node.depth, []);
      byDepth.get(node.depth).push(node);
    }

    const primary = el('button', { class: 'action primary', type: 'button' });
    const counter = el('span', {});
    const updateCount = () => {
      const count = nodes.filter((node) => node.selected).length;
      primary.textContent = `Ophalen en samenvoegen (${count}) →`;
      primary.disabled = count === 0;
      counter.textContent = `${count} van ${nodes.length} geselecteerd`;
    };

    const groups = [...byDepth.keys()].sort((a, b) => a - b).map((depth) => {
      const pages = byDepth.get(depth);
      const label = depth === 0 ? 'Startpagina' : `Niveau ${depth} — ${pages.length} pagina's`;
      return el('div', { class: 'group' }, [
        el('div', { class: 'group-title', text: label }),
        ...pages.map((node) => {
          const checkbox = el('input', { type: 'checkbox' });
          checkbox.checked = node.selected;
          checkbox.addEventListener('change', () => {
            node.selected = checkbox.checked;
            updateCount();
          });
          return el('label', { class: 'row' }, [
            checkbox,
            el('span', { class: 'text' }, [
              el('span', { class: 'name', text: node.title || shortenUrl(node.url, 60) }),
              el('span', { class: 'path', text: shortenUrl(node.url, 110) }),
              node.failed ? el('span', { class: 'fail', text: `Niet opgehaald: ${node.reason}` }) : null,
            ]),
          ]);
        }),
      ]);
    });

    const setAll = (value) => {
      for (const node of nodes) node.selected = value && !node.failed;
      renderReview();
    };

    const fetchedCount = nodes.filter((node) => node.fetched).length;
    const summary = el('div', { class: 'summary' }, [
      el('strong', { text: `${formatNumber(nodes.length)} pagina's gevonden` }),
      el('div', {
        text: `Diepte ${options.depth}. ${formatNumber(fetchedCount)} al opgehaald, `
          + `${formatNumber(nodes.length - fetchedCount)} nog te doen.`,
      }),
    ]);

    panel.render([
      summary,
      state.crawler.truncated
        ? el('div', { class: 'warn', text: `Er zijn meer pagina's dan het maximum van ${options.maxPages}. De lijst is afgekapt.` })
        : null,
      el('div', { class: 'toolbar' }, [
        counter,
        el('button', { class: 'link', type: 'button', text: 'alles aan', onclick: () => setAll(true) }),
        el('button', { class: 'link', type: 'button', text: 'alles uit', onclick: () => setAll(false) }),
      ]),
      ...groups,
    ], [
      el('button', { class: 'action', type: 'button', text: '← Terug', onclick: renderStart }),
      primary,
    ]);

    primary.addEventListener('click', () => runCollect(nodes.filter((node) => node.selected)));
    updateCount();
  }

  /* ---------------- stap 4: ophalen en opslaan ---------------- */

  async function runCollect(selected) {
    state.cancelled = false;
    panel.setStep('Ophalen…');
    renderProgress("Pagina's ophalen en omzetten…");
    let result;
    try {
      result = await state.crawler.collect(selected);
    } catch (error) {
      panel.setStatus(`Ophalen mislukt: ${error && error.message ? error.message : error}`);
      return;
    }
    if (state.cancelled) return;
    if (!result.pages.length) {
      panel.setStatus('Geen enkele pagina kon worden opgehaald.');
      renderReview();
      return;
    }
    state.document = assembleDocument({
      startUrl: options.url,
      depth: options.depth,
      pages: result.pages,
      failures: result.failures,
    });
    renderDone(result);
  }

  function renderDone(result) {
    panel.setStep('Klaar');
    panel.setStatus('');
    const { markdown, stats } = state.document;
    const suggestedName = buildFilename(options.url, result.pages[0] ? result.pages[0].title : '');
    const nameInput = el('input', { type: 'text', value: suggestedName, spellcheck: 'false' });
    const splitSelect = el('select', {}, SPLIT_CHOICES.map((choice) =>
      el('option', { value: String(choice.value), text: choice.label })));
    splitSelect.value = String(options.splitWords);

    const download = () => {
      const words = Number(splitSelect.value) || 0;
      options.splitWords = words;
      rememberOptions(options);
      const parts = splitDocument(markdown, nameInput.value.trim() || suggestedName, words);
      const failed = [];
      for (const part of parts) {
        const outcome = saveTextFile(part.name, part.content);
        if (!outcome.ok) failed.push(part.name);
      }
      panel.setStatus(failed.length
        ? `Download geweigerd voor ${failed.join(', ')} — probeer "Via Tampermonkey".`
        : `${parts.length === 1 ? 'Bestand' : `${parts.length} bestanden`} gedownload.`);
    };

    panel.render([
      el('div', { class: 'stats' }, [
        el('div', {}, [el('strong', { text: formatNumber(stats.pages) }), el('span', { text: "pagina's" })]),
        el('div', {}, [el('strong', { text: formatNumber(stats.words) }), el('span', { text: 'woorden' })]),
        el('div', {}, [el('strong', { text: `≈${formatNumber(stats.tokens)}` }), el('span', { text: 'tokens' })]),
        el('div', {}, [el('strong', { text: formatBytes(markdown.length) }), el('span', { text: 'grootte' })]),
      ]),
      stats.tokens > TOKEN_WARNING_THRESHOLD
        ? el('div', { class: 'warn', text: 'Dit document is erg groot voor één contextvenster. Overweeg te splitsen of minder pagina\'s te selecteren.' })
        : null,
      result.failures.length
        ? el('div', { class: 'warn' }, [
          el('div', { text: `${result.failures.length} pagina('s) konden niet worden opgehaald; ze staan onderaan het document.` }),
        ])
        : null,
      el('label', { class: 'field' }, [
        el('span', { class: 'label', text: 'Bestandsnaam' }),
        nameInput,
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'label', text: 'Grote documenten' }),
        splitSelect,
      ]),
      el('label', { class: 'field' }, [
        el('span', { class: 'label', text: 'Voorbeeld' }),
        el('textarea', { readonly: true, text: markdown.slice(0, 4000) }),
        el('span', { class: 'hint', text: 'Leg het bestand in je repository en verwijs er in Copilot Chat naar met #file:' }),
      ]),
    ], [
      el('button', { class: 'action', type: 'button', text: 'Opnieuw', onclick: renderStart }),
      el('button', {
        class: 'action',
        type: 'button',
        text: 'Kopiëren',
        onclick: () => {
          const outcome = copyToClipboard(markdown);
          panel.setStatus(outcome.ok ? 'Naar klembord gekopieerd.' : `Kopiëren mislukt: ${outcome.reason}`);
        },
      }),
      el('button', {
        class: 'action',
        type: 'button',
        text: 'Via Tampermonkey',
        onclick: () => {
          const outcome = saveViaGm(nameInput.value.trim() || suggestedName, markdown);
          panel.setStatus(outcome.ok ? 'Download gestart via Tampermonkey.' : `Mislukt: ${outcome.reason}`);
        },
      }),
      el('button', { class: 'action primary', type: 'button', text: 'Download .md', onclick: download }),
    ]);
  }

  renderStart();
}


/* =========================================================
 * src/main.js
 * ========================================================= */
/* ------------------------------------------------------------------ *
 * main — het knopje op de pagina en de menucommando's.
 *
 * Er wordt bewust géén sneltoets gebonden. Edge houdt combinaties als
 * Ctrl+Shift+M voor zichzelf (profiel wisselen) en stuurt die nooit naar de
 * pagina, dus een sneltoets is per browserversie en toetsenbordindeling een
 * gok. Een knopje werkt altijd.
 * ------------------------------------------------------------------ */

const BUTTON_SIZE = 34;
const DRAG_THRESHOLD = 4;
const DEFAULT_BUTTON_POSITION = { right: 18, bottom: 18 };

const BUTTON_CSS = `
:host { all: initial; }
button {
  position: fixed; width: ${BUTTON_SIZE}px; height: ${BUTTON_SIZE}px;
  z-index: 2147483000; padding: 0; border: 0; border-radius: 50%;
  background: #2563eb; color: #fff; cursor: pointer; opacity: .45;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .3);
  font: 600 17px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  display: flex; align-items: center; justify-content: center;
  transition: opacity .15s, transform .15s;
  touch-action: none; -webkit-user-select: none; user-select: none;
}
button:hover, button:focus-visible { opacity: 1; transform: scale(1.08); }
button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
`;

function findButtonHost() {
  return document.querySelector('[data-web-to-file="button"]');
}

/** De knop staat per site aan; standaard nergens. */
function isButtonEnabled() {
  return getDomainConfig(location.host).button === true;
}

function currentViewport() {
  return { width: window.innerWidth, height: window.innerHeight, size: BUTTON_SIZE };
}

function readButtonPosition() {
  const stored = getGlobalFlag('buttonPosition', null);
  return clampToViewport(stored || DEFAULT_BUTTON_POSITION, currentViewport());
}

/**
 * Maakt de knop versleepbaar. Onder de drempel van een paar pixels blijft het een
 * gewone klik, zodat verplaatsen en openen elkaar niet in de weg zitten.
 */
function makeDraggable(button) {
  let position = readButtonPosition();
  let start = null;
  let dragged = false;

  const apply = () => {
    button.style.right = `${position.right}px`;
    button.style.bottom = `${position.bottom}px`;
  };

  const onMove = (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!dragged && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
    dragged = true;
    position = clampToViewport({ right: start.right - dx, bottom: start.bottom - dy }, currentViewport());
    apply();
  };

  const onUp = () => {
    window.removeEventListener('pointermove', onMove, true);
    window.removeEventListener('pointerup', onUp, true);
    if (!start) return;
    start = null;
    if (dragged) {
      setGlobalFlag('buttonPosition', position);
      button.dataset.dragged = 'true';
    }
  };

  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    start = { x: event.clientX, y: event.clientY, right: position.right, bottom: position.bottom };
    dragged = false;
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
  });

  // Na een sleep hoort de afsluitende klik de wizard niet te openen.
  button.addEventListener('click', (event) => {
    if (button.dataset.dragged === 'true') {
      delete button.dataset.dragged;
      event.preventDefault();
      return;
    }
    openWizard();
  });

  const onResize = () => {
    position = clampToViewport(position, currentViewport());
    apply();
  };
  window.addEventListener('resize', onResize);
  apply();
  return () => window.removeEventListener('resize', onResize);
}

function mountFloatingButton() {
  if (findButtonHost()) return;
  const host = el('div', { 'data-web-to-file': 'button' });
  host.style.cssText = 'all: initial;';
  const shadow = host.attachShadow({ mode: 'open' });
  const button = el('button', {
    type: 'button',
    title: "Pagina('s) opslaan als Markdown — versleep om te verplaatsen",
    'aria-label': "Pagina('s) opslaan als Markdown",
    text: '↓',
  });
  shadow.append(el('style', { text: BUTTON_CSS }), button);
  host.webToFileCleanup = makeDraggable(button);
  document.body.append(host);
}

function unmountFloatingButton() {
  const host = findButtonHost();
  if (!host) return;
  if (typeof host.webToFileCleanup === 'function') host.webToFileCleanup();
  host.remove();
}

function setButtonEnabled(enabled) {
  patchDomainConfig(location.host, { button: Boolean(enabled) });
  if (enabled) mountFloatingButton();
  else unmountFloatingButton();
}

function registerMenu() {
  if (typeof GM_registerMenuCommand !== 'function') return;
  GM_registerMenuCommand("Pagina('s) opslaan als Markdown", openWizard);
  // Neutraal label: Tampermonkey kan het label niet bijwerken zonder herladen,
  // dus een "aanzetten"/"uitzetten"-tekst zou na het omzetten onjuist zijn.
  GM_registerMenuCommand('Knopje op deze site aan-/uitzetten', () => setButtonEnabled(!isButtonEnabled()));
  GM_registerMenuCommand('Content-element kalibreren…', startCalibration);
  GM_registerMenuCommand('Kalibratie voor dit domein wissen', clearCalibration);
}

function boot() {
  registerMenu();
  if (isButtonEnabled()) mountFloatingButton();

  // Alleen voor de testharnas in test/browser.html; op echte pagina's uit.
  if (globalThis.__WEB_TO_FILE_TEST__) {
    globalThis.webToFile = {
      normalizeUrl, dedupeKey, slugify, uniqueSlug, countWords, estimateTokens, shortenUrl,
      clampToViewport,
      createScopeFilter, guessScopePrefix, collectLinks, createCrawler,
      parseHtml, findContentRoot, cleanContent, extractPageMeta, cssPathFor,
      pageToMarkdown, prepareContent, renderContent, demoteHeadings, absolutizeUrls, tidyMarkdown,
      assembleDocument, buildFilename, splitDocument,
      openWizard, startCalibration,
      isButtonEnabled, setButtonEnabled, mountFloatingButton, unmountFloatingButton,
    };
  }
}

boot();

})();
