var machina = require( "machina" ),
	path = require( "path" );

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
			var pluginConfig = anvil.config[ this.name ],
				ignore = pluginConfig ? pluginConfig.ignore : [];
			pluginConfig.ignore = _.map( ignore, function( filter ) {
				if( !_.isRegExp( filter ) ) {
					return anvil.utility.parseRegex( filter );
				} else {
					return filter;
				}
			} );
			pluginConfig.watchPaths = pluginConfig.watchPaths.concat(
				[ anvil.config.source, anvil.config.spec, anvil.config.external ] );
			if( command.ci ) {
				pluginConfig.continuous = true;
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

		loadExt: function( done ) {
			var external = anvil.config.external,
				extDir = path.basename( external ),
				exists = anvil.fs.pathExists( external );
			if( !exists ) {
				done();
			} else {
				anvil.fs.getFiles( external, anvil.config.working, function( files, directories ) {
					anvil.log.step( "Scanning external dependencies: " + external );
					var metadata = _.map( files, function( file ) {
							var base = file.originalPath.replace( anvil.config.external, "" ),
								baseDir = path.dirname( base ),
								relative = anvil.fs.buildPath( extDir, baseDir ),
								working = anvil.fs.buildPath( anvil.config.working, extDir, baseDir );
							file.relativePath = relative;
							return file;
						} );
					metadata = _.uniq( metadata, false, function( x ) { return x.fullPath; } );
					anvil.project.dependencies = metadata;
					done();
				}, anvil.config[ this.name ].ignore );
			}
		},

		run: function( done ) {
			this.callback = done;
			this.transition( "scanning" );
		},

		watchAll: function() {
			var self = this;
			_.each( anvil.config[ this.name ].watchPaths, self.watch );
		},

		watch: function( path ) {
			var self = this;
			if( anvil.fs.pathExists( path ) ) {
				this.watchers.push(
					anvil.fs.watch( path, function( event ) {
						if( !event.isDelete() ) {
							self.handle( "file.change", event.name, path );
						} else {
							self.handle( "file.deleted", event.name, path );
						}
					} )
				);
			}
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
						self.loadExt( function() {
							self.loadSpecs( function() {
								self.transition( "watching" );
							} );
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
					anvil.raise( "file.changed", "change", file, path );
				},
				"file.deleted": function( file, path ) {
					anvil.log.event( "file deleted: '" + file + "'" );
					anvil.raise( "file.deleted", "deleted", file, path );
				}
			}
		}
	};
	
	return anvil.plugin( new machina.Fsm( loader ) );
};