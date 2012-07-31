$(function() {
	var content_visible = null;
	BtappContentView = Backbone.View.extend({
		tagName: "div",
		className: "content",
		initialize: function() {
			_.bindAll(this, 'render', 'show', 'remove');
			this.model.bind('add remove change', this.render);
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
			var variables = $('<div></div>');
			variables.addClass('variables');
			var header = $('<h4>attributes:</h4>');
			variables.append(header);
			_(this.model.attributes).each(function(attribute, key) {
				if(this.model.attributes.hasOwnProperty(key)) {
					if(!(typeof attribute === 'object' && attribute !== null && 'bt' in attribute)) {
						var variable = $('<p><span>' + key + '</span>: ' + attribute + '</p>');
						variables.append(variable);

						variable.popover({
							animation: true,
							placement: 'in bottom',
							trigger: 'hover',
							title: 'Set "' + key + '"',
							content: '<form class="well form-inline"><input type="text" class="input-small" placeholder="' + attribute + '">  <button type="submit" class="btn">Set</button></form>'
						});
						var notify = function(type, text) {
							var a = $('<div class="alert alert-' + type + '">' + text + '</div>');
							a.alert();
							variable.after(a);
							setTimeout(_.bind(a.alert, a, 'close'), 2000);

							variable.popover('hide');
						}
						variable.on('submit', _.bind(function(e) {
							e.preventDefault();
							if(variable.find('button').hasClass('disabled')) return;

							variable.find('button').addClass('disabled');
							try {
								var val = variable.find('.input-small').val();
								var v = eval(val);
								this.model.bt.set(key, v).then(_.bind(function(data) {
									console.log(JSON.stringify(data));
									var path = this.model.url.split('/');
									for(var i = 0; i < path.length - 1; i++) {
										var link = decodeURIComponent(path[i]);
										if(!(link in data)) {
											notify('error', 'return value malformed: ' + JSON.stringify(data));
											return;
										}
										data = data[link];
									}
									if('set' in data && data.set === 'success') {
										notify('success', data.set);
									} else {
										notify('default', data.set);
									}
								}, this)).fail(function() {
									notify('error', 'failed to set ' + key + ' for unknown reason.');
								});
							} catch(e) {
								notify('error', 'failed to evaluate ' + val);
							}
						}, this));
					}
				}
			}, this);
			$(this.el).append(variables);
		},
		render_functions: function() {
			var functions = $('<div></div>');
			functions.addClass('functions');
			functions.css('position', 'relative');
			var header = $('<h4>functions:</h4>');
			functions.append(header);

			_.each(this.model.bt, function(z, key) {
				if(this.model.hasOwnProperty(key)) {
					var signatures = this.model.bt[key].valueOf().split('(');
					var symbol = $('<p>' + key + ':</p>');
					functions.append(symbol);

					for(var i = 1; i < signatures.length; i++) {
						var signature = $('<p><span>function</span>(' + ((signatures[i] !== ')') ? signatures[i] : ')') + '</p>');
						functions.append(signature);
						signature.popover({
							animation: true,
							placement: 'in bottom',
							trigger: 'hover',
							title: 'Call ' + key,
							content: '<button type="submit" class="btn">Call Function</button>'
						});
						var notify = function(type, text) {
							var a = $('<div class="alert alert-' + type + '">' + text + '</div>');
							a.alert();
							signature.after(a);
							setTimeout(_.bind(a.alert, a, 'close'), 2000);

							signature.popover('hide');
						}
						signature.on('click', _.bind(function(e) {
							e.preventDefault();
							if(signature.find('button').hasClass('disabled')) return;

							signature.find('button').addClass('disabled');
							try {
								this.model.bt[key]().then(_.bind(function(data) {
									console.log(JSON.stringify(data));
									var path = this.model.url.split('/');
									for(var i = 0; i < path.length - 1; i++) {
										var link = decodeURIComponent(path[i]);
										if(!(link in data)) {
											notify('error', 'return value malformed: ' + JSON.stringify(data));
											return;
										}
										data = data[link];
									}
									if(key in data) {
										notify('success', JSON.stringify(data[key]));
									} else {
										notify('default', data.set);
									}
								}, this)).fail(function() {
									notify('error', 'failed to call ' + symbol + ' for unknown reason.');
								});
							} catch(e) {
								notify('error', JSON.stringify(e));
							}
						}, this));					
					}
				}
			}, this);
			$(this.el).append(functions);
		},
		show: function() {
			if(content_visible) {
				$(content_visible.el).hide();
			}
			$(this.el).show();
			content_visible = this;
		}
	});

	BtappSidebarView = Backbone.View.extend({
		tagName: "div",
		initialize: function() {
			Backbone.View.prototype.initialize.apply(this, arguments);	
			_.bindAll(this, 'render', '_add', '_remove', 'remove');
			this.model.bind('add', this._add);
			this.model.bind('remove', this._remove);
			this.model.bind('add remove change', this.render);
			this.expanded = true;
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
	
	BtappCollectionSidebarView = BtappSidebarView.extend({
		tagName: "div",
		initialize: function() {
			BtappSidebarView.prototype.initialize.apply(this, arguments);	
			this.model.each(this._add);
		},
		_add: function(model) {
			this._views[model.url] = new BtappModelSidebarView({'model':model});
		},
		_remove: function(model) {
			this._views[model.url].remove();
			delete this._views[model.url];
		}
	});
	BtappModelSidebarView = BtappSidebarView.extend({
		tagName: "div",
		initialize: function() {
			BtappSidebarView.prototype.initialize.apply(this, arguments);	
			_.each(this.model.attributes, _.bind(function(value, key) {
				this._add(value);
			}, this));
		},
		_add: function(attribute) {
			if(typeof attribute === 'object' && attribute !== null && 'bt' in attribute) {
				if('length' in attribute) {
					this._views[attribute.url] = new BtappCollectionSidebarView({'model':attribute});
				} else {
					this._views[attribute.url] = new BtappModelSidebarView({'model':attribute});
				}
			}
		},
		_remove: function(attribute) {
			if(typeof attribute === 'object' && attribute !== null && 'bt' in attribute) {
				for(var v in this._views) {
					if(this._views[v].model.url === attribute.url) {
						this._views[v].model.trigger('destroy');
						delete this._views[v];
					}
				}
			}
		}
	});

	var btapp = new Btapp;
	_(Btapp.QUERIES).each(function(query, label) {
		var input = $('<option>' + label + '</option>');
		$('#queries').append(input);
	});

	$('#queries').change(function(val) {
		btapp.disconnect();
		btapp.connect({
			product: $('#productname option:selected').val(), 
			queries: [ Btapp.QUERIES[$('#queries option:selected').val()]]
		});
	});

	$('#productname').append('<option>Torque</option>');
	$('#productname').append('<option>uTorrent</option>');

	$('#productname').change(function(val) {
		var querykey = $('#queries option:selected').val();
		btapp.disconnect();
		var product = $('#productname option:selected').val();
		btapp.connect({
			product: product, 
			queries: [ Btapp.QUERIES[querykey] ],
			plugin: product == 'Torque',
			pairing_type: product == 'Torque' ? 'iframe' : 'native'
		});
	});

	btapp.connect({
		product: $('#productname option:selected').val(), 
		queries: [ Btapp.QUERIES[$('#queries option:selected').val()]]
	});

	btappview = new BtappModelSidebarView({'model':btapp});
	btappview.expanded = true;
	$('#data').append(btappview.render().el);
	btappview.content.show();
	
	$('#adddemocontent').click(function() {
		if(btappview.model.get('add')) {
			var rss_feed_url = 'http://www.clearbits.net/feeds/creator/191-megan-lisa-jones.rss';
			var torrent_url = 'http://www.clearbits.net/get/1684-captive---bittorrent-edition.torrent';
			btappview.model.get('add').rss_feed(rss_feed_url);
			btappview.model.get('add').torrent(torrent_url, 'demo_torrents');
		} else {
			alert('not connected to a torrent client...sad times');
		}
	});
	$('#removedemocontent').click(function() {
		var torrents = btappview.model.get('torrent');
		if(torrents) {
			var torrent = btappview.model.get('torrent').get('btapp/torrent/all/C106173C44ACE99F57FCB83561AEFD6EAE8A6F7A/');
			torrent && torrent.remove();
		}
	});
	$('#connectremote').click(function() {
		var name = prompt("Please enter a username");
		var password = prompt("Please enter a password");
		btapp.bind('remoteStatus', function(status) {
			if(status.status === "Status: Accessible") {
				alert('Client connected to falcon...connecting our btapp object through falcon instead of via localhost');
				btapp.disconnect();
				btapp.connect({
					username: name,
					password: password,
					product: $('#productname option:selected').val(),
					queries: [ Btapp.QUERIES[$('#queries option:selected').val()]]
				});
			}
		}, this);
		btapp.connect_remote(
			name, 
			password
		);
	});
});