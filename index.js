$(function() {
	"use strict";
	"use curly";
	var content_visible = null;
	window.BtappContentView = Backbone.View.extend({
		tagName: "div",
		className: "content",
		initialize: function() {
			_.bindAll(this, 'render', 'show');
			this.model.bind('change', this.render);
			this.model.bind('destroy', this.remove);
			$(this.el).hide();
		},
		render: function() {
			$(this.el).empty();
			if(!this.model.url) {
				return this;
			}
			this.render_url();
			this.render_attributes();
			this.render_functions();
			return this;
		},
		render_url: function() {
			var html = '';
			html += '<div class="url"><h4>url:<p>' + this.model.url + '</p></h4></div>';
			$(this.el).append(html);
		},
		render_attributes: function() {
			var html = '';
			//add the attributes
			html += '<div class="variables"><h4>attributes:';
			for(var key in this.model.attributes) {
				if(this.model.attributes.hasOwnProperty(key)) {
					var attribute = this.model.attributes[key];
					if(!(typeof attribute === 'object' && 'bt' in attribute)) {
						html += '<p><span>' + key + '</span>: ' + attribute + '</p>';
					}
				}
			}
			html += '</h4></div>';
			$(this.el).append(html);
		},
		render_functions: function() {
			var html = '';
			html += '<div class="functions"><h4>functions:';
			for(var key in this.model.bt) {
				if(this.model.bt.hasOwnProperty(key)) {
					var signatures = this.model.bt[key].valueOf().split('(');
					html += '<p>' + key + ':</p>';
					for(var i = 1; i < signatures.length; i++) {
						html += '<p><span>function</span>(' + signatures[i] + '</p>';
					}
				}
			}
			html += '</h4></div>';
			$(this.el).append(html);
		},
		show: function() {
			if(content_visible) {
				$(content_visible.el).hide();
			}
			$(this.el).show();
			content_visible = this;
		}
	});

	window.BtappSidebarView = Backbone.View.extend({
		tagName: "div",
		initialize: function() {
			Backbone.View.prototype.initialize.apply(this, arguments);	
			_.bindAll(this, 'render', '_add', '_remove');
			this.model.bind('add', this._add);
			this.model.bind('remove', this._remove);
			this.model.bind('change', this.render);
			this.model.bind('destroy', this.remove);
			this.expanded = false;
			this._views = {};

			this.content = new BtappContentView({'model':this.model});
			$('#content').append(this.content.render().el);
		},
		render_label: function() {
			var toks = this.model.url.split('/');
			var link = $('<a href="#">' + unescape(toks[toks.length-2]) + '</a>');
			link.click(this.content.show);
			$(this.el).append(link);
		},
		render_toggle: function() {
			var toggle = $('<div></div>');
			toggle.addClass('toggle');
			if(_.keys(this._views).length > 0) {
				toggle.addClass(this.expanded ? 'down' : 'right');
			}
			$(this.el).append(toggle);
			toggle.click(_.bind(function(toggle) {
				if(!toggle.hasClass('right') && !toggle.hasClass('down')) {
					return;
				}

				$(this.el).children('.children').toggle();
				if(toggle.hasClass('right')) {
					toggle.removeClass('right');
					toggle.addClass('down');
				} else {
					toggle.removeClass('down');
					toggle.addClass('right');
				}
				this.expanded = !this.expanded;
			}, this, toggle));
		},
		render_children: function() {
			if(_.keys(this._views).length > 0) {
				var children = $('<div></div>');
				children.addClass('children');
				for(var key in this._views) {
					if(this._views.hasOwnProperty(key)) {
						children.append($(this._views[key].render().el));
					}
				}
				if(!this.expanded) {
					children.hide();
				}
				$(this.el).append(children);
			}
		},
		render: function() {
			$(this.el).empty();
			if(!this.model.url) {
				return this;
			}

			this.render_toggle();
			this.render_label();
			this.render_children();
			return this;
		}
	});
	
	window.BtappCollectionSidebarView = BtappSidebarView.extend({
		tagName: "div",
		initialize: function() {
			BtappSidebarView.prototype.initialize.apply(this, arguments);	
			this.model.each(this._add);
		},
		_add: function(model) {
			this._views[model.url] = new BtappModelSidebarView({'model':model});
		},
		_remove: function(model) {
			this._views[model.url].destructor();
			delete this._views[model.url];
		}
	});
	window.BtappModelSidebarView = BtappSidebarView.extend({
		tagName: "div",
		initialize: function() {
			BtappSidebarView.prototype.initialize.apply(this, arguments);	
			_.each(this.model.attributes, _.bind(function(value, key) {
				this._add(value);
			}, this));
		},
		_add: function(attribute) {
			if(typeof attribute === 'object' && 'bt' in attribute) {
				if('length' in attribute) {
					this._views[attribute.url] = new BtappCollectionSidebarView({'model':attribute});
				} else {
					this._views[attribute.url] = new BtappModelSidebarView({'model':attribute});
				}
			}
		},
		_remove: function(attribute) {
			if(typeof attribute === 'object' && 'bt' in attribute) {
				for(var v in this._views) {
					if(this._views[v].model.url === attribute.url) {
						this._views[v].model.trigger('destroy');
					}
				}
			}
		}
	});

	window.btappview = new window.BtappModelSidebarView({'model':new Btapp});
	window.btappview.expanded = true;
	$('#data').append(window.btappview.render().el);
	btappview.content.show();
	
	$('#adddemocontent').click(function() {
		if(window.btappview.model.get('add')) {
			var rss_feed_url = 'http://www.clearbits.net/feeds/creator/191-megan-lisa-jones.rss';
			var torrent_url = 'http://www.clearbits.net/get/1684-captive---bittorrent-edition.torrent';
			window.btappview.model.get('add').bt.rss_feed(function() {}, rss_feed_url);
			window.btappview.model.get('add').bt.torrent(function() {}, torrent_url, 'demo_torrents');
		} else {
			alert('not connected to a torrent client...sad times');
		}
	});
	$('#removedemocontent').click(function() {
		var torrents = window.btappview.model.get('torrent');
		if(torrents) {
			var torrent = window.btappview.model.get('torrent').get('btapp/torrent/all/C106173C44ACE99F57FCB83561AEFD6EAE8A6F7A/');
			if(torrent) {
				torrent.bt.remove(function() {});
			}
		}
	});
});