/*
	anvil.identify - An anvil core plugin that identifies files for the build
	version:	0.0.1
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var machina = require( "machina" );

module.exports = function( _, anvil ) {
	
	var loader = {
		name: "anvil.identify",
		activity: "identify",
		commander: [
			[ "--ci", "continuously build on file changes" ]
		],
		prerequisites: [],
		excluded: [],
		config: {
			continuous: false,
			watchPaths: [
				anvil.config.source,
				anvil.config.spec
			],
			ignore: [
				"/.*[.]sw.?/",
				"/.*[~]$/",
				"/#.*#$/"
			]
		},
		watchers: [],
		initialState: "waiting",

		buildDone: function() {
			this.handle( "build.done" );
		},

		buildFailed: function() {
			this.handle( "build.done" );
		},

		callback: function() {},

		configure: function( config, command, done ) {
			var pluginConfig = config[ this.name ],
				ignore = pluginConfig ? pluginConfig.ignore : [];
			anvil.config[ this.name ].ignore = _.map( ignore, function( filter ) {
				if( !_.isRegExp( filter ) ) {
					return anvil.utility.parseRegex( filter );
				} else {
					return filter;
				}
			} );
			if( command.ci ) {
				anvil.config[ this.name ].continuous = true;
			}
			done();
		},

		loadSource: function( done ) {
			anvil.log.step( "Scanning source directory: " + anvil.config.source );
			anvil.fs.getFiles( anvil.config.source, anvil.config.working, function( files, directories ) {
				anvil.project.files = anvil.project.files.concat( files );
				anvil.project.directories = directories;
				anvil.log.event( "found " + directories.length + " directories with " + files.length + " files" );
				done();
			}, anvil.config[ this.name ].ignore );
		},

		loadSpecs: function( done ) {
			anvil.fs.getFiles( anvil.config.spec, anvil.config.working, function( files, directories ) {
				anvil.project.specs = files;
				anvil.project.directories = anvil.project.directories.concat( directories );
				anvil.log.event( "found " + files.length + " spec files" );
				done();
			}, anvil.config[ this.name ].ignore );
		},

		run: function( done ) {
			this.callback = done;
			this.transition( "scanning" );
		},

		watchAll: function() {
			var self = this;
			_.each( anvil.config[ this.name ].watchPaths, function( target ) {
				self.watch( target );
			} );
		},

		watch: function( path ) {
			var self = this;
			this.watchers.push(
				anvil.fs.watch( path, function( event ) {
					if( !event.isDelete() ) {
						self.handle( "file.change", event.name, path );
					} else {
						self.handle( "file.deleted", event.name, path );
					}
				} )
			);
		},

		unwatchAll: function() {
			while( this.watchers.length > 0 ) {
				this.watchers.pop().end();
			}
		},

		states: {
			"waiting": {
				_onEnter: function() {
					
				},
				"build.done": function() {
					self.transition( "watching" );
				}
			},

			"scanning": {
				_onEnter: function() {
					var self = this;
					this.excluded.push( anvil.config.output );
					this.loadSource( function() {
						self.loadSpecs( function() {
							self.transition( "watching" );
						} );
					} );
				}
			},

			"watching": {
				_onEnter: function() {
					if( this.config.continuous ) {
						this.watchAll();
					}
					this.callback();
				},
				"file.change": function( file, path ) {
					anvil.log.event( "file change in '" + file + "'" );
					anvil.events.raise( "file.changed", "change", file, path );
				},
				"file.deleted": function( file, path ) {
					anvil.log.event( "file deleted: '" + file + "'" );
					anvil.events.raise( "file.deleted", "deleted", file, path );
				}
			}
		}
	};
	
	return anvil.plugin( new machina.Fsm( loader ) );
};