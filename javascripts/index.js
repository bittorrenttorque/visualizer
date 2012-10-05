$(function() {
	var wiggle = function(elem) {
        return;
		elem.wiggle('start', { limit: 1});
	}

	var proxy = _.extend({}, Backbone.Events);

    var ContentFunctionView = Backbone.View.extend({
        initialize: function() {
            this.template = _.template($('#content_function_template').html());
        },
        render: function() {
            this.$el.html(this.template({
                name: this.options.name
            }));
            return this;
        }
    });

    var ContentFunctionsView = Backbone.View.extend({
    	initialize: function() {
    		this.template = _.template($('#content_functions_template').html());
    		this.render();
    		this.model.on('destroy', this.destroy, this);
            _.each(this.model.bt, this.addFunction, this);
    	},
        addFunction: function(signatures, name) {
            var view = new ContentFunctionView({
                model: this.model,
                name: name,
                signatures: signatures
            });
            this.$('.functions').append(view.render().el);
        },
    	destroy: function() {
    		this.model.off('destroy', this.destroy, this);
    	},
    	render: function() {
            var functions = this.$('.functions').children().detach();
    		this.$el.html(this.template({
    		}));
            this.$('.functions').append(functions);
    		return this;
    	}
    });

    var ContentAttributesView = Backbone.View.extend({
    	initialize: function() {
    		this.template = _.template($('#content_attributes_template').html());
    		this.render();
    		this.model.on('destroy', this.destroy, this);
    	},
    	destroy: function() {
    		this.model.off('destroy', this.destroy, this);
    	},
    	render: function() {
    		this.$el.html(this.template({

    		}));
    		return this;
    	}
    });

    var ContentView = Backbone.View.extend({
        initialize: function() {
            this.template = _.template($('#content_template').html());
            this.render();
            this.model.on('destroy', this.destroy, this);
            var functions = new ContentFunctionsView({
            	model: this.model
            });
            this.$('>.functions_container').append(functions.render().$el);
            var attributes = new ContentAttributesView({
            	model: this.model
            });
            this.$('>.attributes_container').append(attributes.render().$el);

            proxy.on(escape(JSON.stringify(this.model.path)), this.show, this);
           	proxy.on('hide', this.hide, this);
        },
        show: function() {
        	this.$el.show();
        },
        hide: function() {
        	this.$el.hide();
        },
        destroy: function() {
            this.model.off('destroy', this.destroy, this);
        	this.off();
        	this.remove();
        },
        render: function() {
        	var attributes = this.$('>.attributes_container').children().detach();
        	var functions = this.$('>.functions_container').children().detach();
            this.$el.html(this.template({
                path: this.model.path
            }));
            wiggle(this.$el);
            this.$('>.attributes_container').append(attributes);
            this.$('>.functions_container').append(functions);
            return this;
        }
    });

    var SidebarView = Backbone.View.extend({
    	events: {
    		'click .sidebar_name': 'click',
    		'click .toggle': 'toggle'
    	},
    	initialize: function() {
            this.model.on('add', this.addElement, this);
            this.model.on('destroy', this.destroy, this);
			var content = new ContentView({
				model: this.model
			});
			this.event = escape(JSON.stringify(this.model.path));
			$('.content').append(content.render().$el);
			content.$el.hide();
            this.expanded = this.model.path.length < 3;
    	},
        toggle: function(ev) {
            if(ev) {
                ev.stopPropagation();
            }
            if(this.expanded) {
                this.hide();
            } else {
                this.show();
            }
            this.expanded = !this.expanded;
        },
        show: function() {
            this.$('>.sidebar_children').show();
            var button = this.$('>.toggle>i');
            button.removeClass('icon-chevron-right');
            button.addClass('icon-chevron-down');
        },
        hide: function() {
            this.$('>.sidebar_children').hide();
            var button = this.$('>.toggle>i');
            button.removeClass('icon-chevron-down');
            button.addClass('icon-chevron-right');
        },
    	click: function(ev) {
    		ev.stopPropagation();
    		proxy.trigger('hide');
    		proxy.trigger(this.event);
    	},
        destroy: function() {
            this.model.off('add', this.addElement, this);
            this.model.off('destroy', this.destroy, this);
            this.off();
            this.remove();
        },
        render: function() {
            var children = this.$('>.sidebar_children').children().detach();
            var name = _.last(this.model.path);
            this.$el.html(this.template({
                name: name,
                model: this.model
            }));
            // Make sure we can tell what was rendered
            wiggle(this.$el);
            //add the children bak 
            children = this.$('>.sidebar_children').append(children);
            if(!this.expanded) {
                this.hide();
            }
            if(children.children().length === 0) {
                this.$('>.toggle').hide();
            }
            return this;
        }
    });

    var SidebarCollectionView = SidebarView.extend({
        initialize: function() {
        	SidebarView.prototype.initialize.apply(this);
            this.template = _.template($('#sidebar_collection_template').html());
            this.render();
            this.model.each(this.addElement, this);
            this.model.on('add remove', this.render, this);
        },
        destroy: function() {
            // Because models' events are proxies through the collection,
            // these destroy events are not necessarily to be trusted.
            // Only destroy outselves if the collection contains no models
            if(this.model.length > 0) {
                return;
            }
            this.model.on('add remove', this.render, this);
            SidebarView.prototype.destroy.apply(this);
        },
        addElement: function(value, key) {
            if(_.isObject(value) && value instanceof Backbone.Model) {
                var view = new SidebarModelView({
                    model: value
                });
                this.$('>.sidebar_children').append(view.render().$el);
            }
        },
    });

    var SidebarModelView = SidebarView.extend({
        initialize: function() {
        	SidebarView.prototype.initialize.apply(this);
            this.template = _.template($('#sidebar_model_template').html());
            this.render();
            _.each(this.model.toJSON(), this.addElement, this);
        },
        addElement: function(value, key) {
            if(_.isObject(value) && value instanceof Backbone.Model) {
                _.defer(_.bind(function() {
                    var view = new SidebarModelView({
                        model: value
                    });
                    this.$('>.sidebar_children').append(view.render().$el);
                }, this));
            } else if(_.isObject(value) && value instanceof Backbone.Collection) {
                var view = new SidebarCollectionView({
                    model: value
                });
                this.$('>.sidebar_children').append(view.render().$el);
            }
        }
    });







	btapp = new Btapp;
	btapp.connect();

	var btappview = new SidebarModelView({
		model: btapp
	});
	$('.sidebar #data').append(btappview.render().$el);
});