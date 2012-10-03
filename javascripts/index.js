$(function() {
	var _content = null;
	var _num_render_content = 0;
	var _num_render_sidebar = 0;
	BtappContentView = Backbone.View.extend({
		tagName: "div",
		className: "content",
		initialize: function() {
			var _this = this;
			this.df_db_render = _.debounce(function() {
				_.defer(function() {
					_this.render();
				});
			});
			this.model.on('add remove change', this.df_db_render, this);
			this.model.on('destroy', this.destroy, this);
		},
		destroy: function() {
			this.model.off('add remove change', this.df_db_render, this);
			this.model.off('destroy', this.destroy, this);
			return this;
		},
		render: function() {
			//console.log('render content - ' + (++_num_render_content));
			$(this.el).empty();
			if(!this.model.path) {
				return this;
			}
			this.render_path();
			this.render_attributes();
			this.render_functions();
			return this;
		},
		render_path: function() {
			var html = '';
			html += '<div class="url"><h4>Path:<p>' + this.model.path + '</p></h4></div>';
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
						if(typeof attribute === 'string') {
							attribute = '\"' + attribute + '\"';
						}
						var container = $('<pre></pre>');
						var variable = $('<p><span>' + key + '</span>: ' + attribute + '</p>');
						var form = $(
							'<form class="well form-inline">' + 
							'<input type="text" class="input-large" placeholder="' + attribute + '">' + 
							'<button type="submit" class="btn">' + 'Set' + '</button>' +
							'</form>'
						);
						var notification = $('<div class="alert"></div>');
						notification.alert();
						notification.hide();
						form.hide();
						container.hover(function() {
							form.show();
						}, function() {
							form.hide();
						});
						container.append(variable);
						container.append(form);
						container.append(notification);
						variables.append(container);

						var notify = function(type, text) {
							var ret = new jQuery.Deferred;
							var typeclass = 'alert-' + type;
							notification.text(text);
							notification.addClass(typeclass);
							notification.show();
							setTimeout(function() {
								notification.toggle('slow', function() {
									notification.removeClass(typeclass);
									ret.resolve();
								});
							}, 2000);
							return ret;
						}
						form.on('submit', _.bind(function(e) {
							e.preventDefault();
							var button = form.find('button');
							if(button.hasClass('disabled')) return;

							button.addClass('disabled');
							var enable = function() {
								button.removeClass('disabled');
							};
							try {
								var val = form.find('.input-large').val();
								var argtext = '(function() { return ' + val + ';})';
								var evalval = eval(argtext)();
								var setret = this.model.bt.set(key, evalval);
								setret.done(_.bind(function(data) {
									if(data === 'success') {
										notify('success', data).then(enable);;
									} else {
										notify('default', data).then(enable);;
									}
								}, this));
								setret.fail(function(data) {
									notify('error', 'failed to set ' + key + ': ' + data).then(enable);
								});
							} catch(e) {
								notify('error', 'failed to evaluate ' + val).then(enable);;
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
				var signatures = this.model.bt[key].valueOf().split('(');
				var symbol = $('<p>' + key + ':</p>');
				functions.append(symbol);

				_(signatures.length-1).times(function(i) {
					++i;
					var container = $('<pre></pre>');
					var signature = $('<p><span>function</span>(' + ((signatures[i] !== ')') ? signatures[i] : ')') + '</p>');
					var content = '<button type="submit" class="btn">Call Function</button>';
					var argsraw = signatures[i].substring(0, signatures[i].length - 1);
					var args = argsraw.length > 0 ? argsraw.split(',') : [];
					
					var content = '<form class="well form-inline">';
					for(var j = 0; j < args.length; j++) {
						content += '<input type="text" class="arg input-large" placeholder="' + args[j] + '">';
					}
					content += '<button type="submit" class="btn">Call Function</button>';
					content += '</form>';
					var form = $(content);
					form.hide();

					var notification = $('<div class="alert"></div>');
					notification.alert();
					notification.hide();

					container.append(signature);
					container.append(form);
					container.append(notification);
					functions.append(container);

					container.hover(function() {
						form.show();
					}, function() {
						form.hide();
					});					

					var notify = function(type, text) {
						var ret = new jQuery.Deferred;
						var typeclass = 'alert-' + type;
						notification.text(text);
						notification.addClass(typeclass);
						notification.toggle('slow');
						setTimeout(function() {
							notification.toggle('slow', function() {
								notification.removeClass(typeclass);
								ret.resolve();
							});
						}, 2000);
						return ret;
					}

					form.on('submit', _.bind(function(e) {
						e.preventDefault();
						var button = form.find('button');
						if(button.hasClass('disabled')) return;

						button.addClass('disabled');
						var enable = function() {
							button.removeClass('disabled');
						}
						try {
							//build a series of strings that we can eval into an argument list for our function
							//eval("(function() { return [function() { alert('hi'); }];})")()[0]()

							var argtext = '(function() { return ['
							var elems = form.find('.arg');
							_.each(elems, function(elem, count) { 
								if(count > 0) argtext += ',';
								argtext += $(elem).val();
							});
							argtext += ']})';
							var argarray = eval(argtext)();

							this.model.bt[key].apply(this, argarray).then(_.bind(function(data) {
								if(typeof data === 'function') {
									data = data.toString();
								}
								console.log(JSON.stringify(data));
								if(data) {
									notify('success', JSON.stringify(data)).then(enable);
								} else {
									notify('default', data).then(enable);
								}
							}, this)).fail(function() {
								notify('error', 'failed to call ' + symbol + ' for unknown reason.').then(enable);
							});
						} catch(e) {
							notify('error', JSON.stringify(e)).then(enable);
						}
					}, this));					
				}, this);
			}, this);
			$(this.el).append(functions);
		}
	});

	BtappSidebarView = Backbone.View.extend({
		tagName: "div",
		initialize: function() {
			Backbone.View.prototype.initialize.apply(this, arguments);	
			this.model.on('add', this._add, this);
			this.model.on('remove', this._remove, this);
			this.drender = _.debounce(this.render, 100);
			this.model.on('add remove', this.drender, this);
			this.expanded = this.model.path.length <= 2;
			this._views = {};
			this.renders = 0;
		},
		render_label: function() {
			var label = unescape(this.model.path[this.model.path.length-1]);
			if(this.model instanceof Backbone.Collection) {
				label += ' (' + this.model.length + ')';
			}
			var link = $('<a href="#">' + label + '</a>');
			link.click(_.bind(function() {
				$('.highlighted').removeClass('highlighted');

				if(_content)
					_content.destroy().remove();
				_content = new BtappContentView({'model':this.model});
				$('#content').append(_content.render().$el);

				link.addClass('highlighted');
			}, this));
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
			//console.log('render sidebar - ' + (++_num_render_sidebar));
			$(this.el).empty();
			if(!this.model.path) {
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
			this.model.each(this._add, this);
		},
		_add: function(model) {
			this._views[model.path] = new BtappModelSidebarView({'model':model});
		},
		_remove: function(model) {
			this._views[model.path].remove();
			delete this._views[model.path];
		}
	});
	BtappModelSidebarView = BtappSidebarView.extend({
		tagName: "div",
		initialize: function() {
			BtappSidebarView.prototype.initialize.apply(this, arguments);	
			_.each(this.model.attributes, _.bind(function(value, key) {
				this._add(value, this);
			}, this));
		},
		_add: function(attribute) {
			if(typeof attribute === 'object' && attribute !== null && 'bt' in attribute) {
				if('length' in attribute) {
					this._views[attribute.path] = new BtappCollectionSidebarView({'model':attribute});
				} else {
					this._views[attribute.path] = new BtappModelSidebarView({'model':attribute});
				}
			}
		},
		_remove: function(attribute) {
			if(typeof attribute === 'object' && attribute !== null && 'bt' in attribute) {
				for(var v in this._views) {
					if(this._views[v].model.path === attribute.path) {
						this._views[v].model.trigger('destroy');
						delete this._views[v];
					}
				}
			}
		}
	});

	var btapp = new Btapp;
	btapp.connect();

	btappview = new BtappModelSidebarView({'model':btapp});
	btappview.expanded = true;
	$('#data').append(btappview.render().el);
});