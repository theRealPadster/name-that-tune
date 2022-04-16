var spurdle=(()=>{var e,a=Object.create,r=Object.defineProperty,o=Object.getOwnPropertyDescriptor,n=Object.getOwnPropertyNames,i=Object.getPrototypeOf,l=Object.prototype.hasOwnProperty,t=(e=>"undefined"!=typeof require?require:"undefined"!=typeof Proxy?new Proxy(e,{get:(e,t)=>("undefined"!=typeof require?require:e)[t]}):e)(function(e){if("react"===e)return Spicetify.React;if("react-dom"===e)return Spicetify.ReactDOM;if("undefined"!=typeof require)return require.apply(this,arguments);throw new Error('Dynamic require of "'+e+'" is not supported')}),c=(t,s,a,i)=>{if(s&&"object"==typeof s||"function"==typeof s)for(let e of n(s))l.call(t,e)||e===a||r(t,e,{get:()=>s[e],enumerable:!(i=o(s,e))||i.enumerable});return t},s=(e,t,s)=>(s=null!=e?a(i(e)):{},c(!t&&e&&e.__esModule?s:r(s,"default",{value:e,enumerable:!0}),e)),u={},p=u,y={default:()=>function(){return L.default.createElement(D,null)}};for(e in y)r(p,e,{get:y[e],enumerable:!0});var f="app-module__container___thHYo_spurdle",d="app-module__title___jzQAy_spurdle",m="app-module__subtitle___eYtbK_spurdle",g="app-module__input___e4A54_spurdle",h="app-module__guessList___F8WJL_spurdle",S="app-module__formButtonContainer___xNdkD_spurdle",_=s(t("react")),P=s(t("react")),w="app-module__correct___z816V_spurdle",v=e=>{var t=e.won&&e.index===e.guesses.length-1;return P.default.createElement("li",{className:t?w:void 0},t?"✔":"x"," ",e.guesses[e.index]||"SKIPPED")};var b=async e=>{const t=await Spicetify.CosmosAsync.get(`sp://core-playlist/v1/playlist/${e}/rows`,{policy:{link:!0}});return t.rows.map(e=>e.link)},A=(e,t)=>{for(const a of e)if("folder"===a.type&&null!=a.rows){if(a.link===t)return a;var s=A(a.rows,t);if(s)return s}},k=async e=>{var t=await Spicetify.CosmosAsync.get("sp://core-playlist/v1/rootlist",{policy:{folder:{rows:!0,link:!0}}}),t=A(t.rows,e);if(null==t)throw"Cannot find folder";let s=[];const a=e=>{if(e.rows)for(const t of e.rows)"playlist"===t.type?s.push(b(t.link)):"folder"===t.type&&a(t)};return a(t),(await Promise.all(s)).flat()},I=async()=>{const e=await Spicetify.CosmosAsync.get("sp://core-collection/unstable/@/list/tracks/all?responseFormat=protobufJson",{policy:{list:{link:!0}}});return e.item.map(e=>e.trackMetadata.link)},E=async e=>{e=e.split(":")[2];const t=await Spicetify.CosmosAsync.get("https://api.spotify.com/v1/albums/"+e);return t.tracks.items.map(e=>e.uri)},R=async e=>{const t=await Spicetify.CosmosAsync.get(`sp://core-show/v1/shows/${e}?responseFormat=protobufJson`),s=t.items.filter(e=>e.episodePlayState.isPlayable);return s.map(e=>e.episodeMetadata.link)},C=async e=>{const t=await Spicetify.CosmosAsync.get(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=queryArtistOverview&variables=%7B%22uri%22%3A%22${e}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22433e28d1e949372d3ca3aa6c47975cff428b5dc37b12f5325d9213accadf770a%22%7D%7D`);return t.data.artist.discography.topTracks.items.map(e=>e.track.uri)};function T(e){let t=e.length;if(t<=1)return e;for(var s=e[0];0<t;){var a=Math.floor(Math.random()*t),i=e[--t];e[t]=e[a],e[a]=i}for(;e[0]===s;)e=T(e);return e}var U=e=>`Shuffled ${e} items!`;async function x(e,t){var s;if("playedstation"!==e[0]){var a=e.length;if(0===a)throw"There is no available track to play";if(1===a)Spicetify.Platform.PlayerAPI.play({uri:e[0]},{featureVersion:Spicetify.Platform.PlayerAPI._defaultFeatureVersion});else{e.push("spotify:delimiter"),Spicetify.Platform.PlayerAPI.clearQueue();const i=!t;await Spicetify.CosmosAsync.put("sp://player/v2/main/queue",{queue_revision:null==(s=Spicetify.Queue)?void 0:s.queueRevision,next_tracks:e.map(e=>({uri:e,provider:i?"queue":"context",metadata:{is_queued:i}})),prev_tracks:null==(s=Spicetify.Queue)?void 0:s.prevTracks}),i||await Spicetify.CosmosAsync.post("sp://player/v2/main/update",{context:{uri:t,url:"context://"+t}}),Spicetify.showNotification(U(a)),Spicetify.Player.next()}}}function N(t){!async function(e){const t=Spicetify.URI.fromString(e);switch(t.type){case Spicetify.URI.Type.SHOW:return R(t.getBase62Id());case Spicetify.URI.Type.PLAYLIST:case Spicetify.URI.Type.PLAYLIST_V2:return b(e);case Spicetify.URI.Type.FOLDER:return k(e);case Spicetify.URI.Type.ALBUM:return E(e);case Spicetify.URI.Type.COLLECTION:return I();case Spicetify.URI.Type.ARTIST:return C(e);case Spicetify.URI.Type.TRACK:case Spicetify.URI.Type.EPISODE:return[e];case Spicetify.URI.Type.STATION:case Spicetify.URI.Type.RADIO:return Spicetify.Platform.PlayerAPI.play({uri:e},{featureVersion:Spicetify.Platform.PlayerAPI._defaultFeatureVersion}),["playedstation"]}throw"Unsupported fetching URI type: "+t.type}(t).then(e=>x(T(e),t)).catch(e=>Spicetify.showNotification(e))}var O=t=>{[document.querySelector(".main-nowPlayingWidget-nowPlaying"),document.querySelector(".player-controls__buttons")].forEach(e=>{e&&(e.style.opacity=t?"1":"0",e.style.pointerEvents=t?"auto":"none")});const e=document.querySelector(".playback-bar");e&&(e.style.pointerEvents=t?"auto":"none")},q=e=>e.trim().replace(/[^a-zA-Z0-9]/g,"").toLowerCase(),D=class extends _.default.Component{constructor(e){super(e),this.state={stage:0,timeAllowed:1,guess:"",guesses:[],won:!1},this.playClick=()=>{{var e;const a=1e3*this.state.timeAllowed,i=Spicetify.Player.getDuration();if(!(a>i)){Spicetify.Player.seek(0),Spicetify.Player.play();let s=0;const r=e=>{if(s)return console.log("debouncing"),void(500<e.timeStamp-s&&(s=0,console.log("reset debouncing")));var t=i*Spicetify.Player.getProgressPercent();console.log({currentProgress:t,endMilliseconds:a}),t>a&&(s=e.timeStamp,Spicetify.Player.pause(),console.log("stopping"),Spicetify.Player.removeEventListener("onprogress",r))};Spicetify.Player.addEventListener("onprogress",r)}return}},this.guessChange=e=>this.setState({guess:e.target.value}),this.skipGuess=e=>{e.preventDefault(),this.setState({guesses:[...this.state.guesses,null],guess:"",stage:this.state.stage+1,timeAllowed:this.state.timeAllowed+1,won:!1})},this.submitGuess=e=>{e.preventDefault(),0!==this.state.guess.trim().length&&(e=this.state.guess,console.log({guess:e}),console.log("title: "+Spicetify.Player.data.track.metadata.title),console.log("artist_name: "+Spicetify.Player.data.track.metadata.artist_name),console.log("album_artist_name: "+Spicetify.Player.data.track.metadata.album_artist_name),(e=q(e)===q(Spicetify.Player.data.track.metadata.title))&&O(!0),this.setState({guesses:[...this.state.guesses,this.state.guess],guess:"",stage:this.state.stage+1,timeAllowed:this.state.timeAllowed+1,won:e}))},this.nextSong=()=>{O(!1),Spicetify.Player.next(),Spicetify.Player.seek(0),Spicetify.Player.pause(),this.setState({guesses:[],guess:"",stage:0,timeAllowed:1,won:!1})},this.URIs=Spicetify.Platform.History.location.state.URIs}componentDidMount(){console.log("App mounted, URIs: ",this.URIs);var e=this.URIs;if(e)if(1===e.length)N(e[0]);else{x(T(e),null);try{Spicetify.Player.pause()}catch(e){console.log("Error pausing player:",e)}Spicetify.Player.seek(0)}}render(){return _.default.createElement(_.default.Fragment,null,_.default.createElement("div",{className:f},_.default.createElement("h1",{className:d},"🎵 Spurdle!"),this.state.won?_.default.createElement("h2",{className:m},"You won!"):null,_.default.createElement("form",{id:"guessForm",onSubmit:this.submitGuess},_.default.createElement("input",{type:"text",className:g,placeholder:"Guess the song",value:this.state.guess,onChange:this.guessChange}),_.default.createElement("div",{className:S},_.default.createElement("button",{type:"submit",className:"main-buttons-button main-button-secondary"},"Guess"),_.default.createElement("button",{className:"main-buttons-button main-button-secondary",onClick:this.skipGuess},"Skip"))),_.default.createElement("button",{className:"main-buttons-button main-button-secondary",onClick:this.playClick},`Play ${this.state.timeAllowed}s`),_.default.createElement("button",{className:"main-buttons-button main-button-secondary",onClick:this.nextSong},"Next song"),_.default.createElement("ol",{className:h},this.state.guesses.map((e,t)=>_.default.createElement(v,{key:t,index:t,guesses:this.state.guesses,won:this.state.won})))))}},L=s(t("react"));return s=u,c(r({},"__esModule",{value:!0}),s)})();const render=()=>spurdle.default();