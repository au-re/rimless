(window.webpackJsonp=window.webpackJsonp||[]).push([[0],{134:function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.CONNECTION_TIMEOUT=1e3,exports.isTrustedRemote=function isTrustedRemote(event){return!0},exports.isWorker=function isWorker(){return"undefined"!=typeof WorkerGlobalScope&&self instanceof WorkerGlobalScope},exports.extractMethods=function extractMethods(obj){var paths=[];return function parse(obj,path){for(var prop in void 0===path&&(path=""),obj){var propPath=path?path+"."+prop:prop;obj[prop]===Object(obj[prop])&&parse(obj[prop],propPath),"function"==typeof obj[prop]&&paths.push(propPath)}}(obj),paths};var urlRegex=/^(https?:|file:)?\/\/([^\/:]+)?(:(\d+))?/,ports={"http:":"80","https:":"443"};exports.getOriginFromURL=function getOriginFromURL(url){var protocol,hostname,port,location=document.location,regexResult=urlRegex.exec(url||"");return regexResult?(protocol=regexResult[1]?regexResult[1]:location.protocol,hostname=regexResult[2],port=regexResult[4]):(protocol=location.protocol,hostname=location.hostname,port=location.port),"file:"===protocol?"null":protocol+"//"+hostname+(port&&port!==ports[protocol]?":"+port:"")}},135:function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),function(events){events.MESSAGE="message"}(exports.events||(exports.events={})),function(actions){actions.HANDSHAKE_REQUEST="RIMLESS/HANDSHAKE_REQUEST",actions.HANDSHAKE_REPLY="RIMLESS/HANDSHAKE_REPLY",actions.RPC_REQUEST="RIMLESS/RPC_REQUEST",actions.RPC_RESOLVE="RIMLESS/RPC_RESOLVE",actions.RPC_REJECT="RIMLESS/RPC_REJECT"}(exports.actions||(exports.actions={}))},226:function(module,exports,__webpack_require__){"use strict";var __awaiter=this&&this.__awaiter||function(thisArg,_arguments,P,generator){return new(P||(P=Promise))(function(resolve,reject){function fulfilled(value){try{step(generator.next(value))}catch(e){reject(e)}}function rejected(value){try{step(generator.throw(value))}catch(e){reject(e)}}function step(result){result.done?resolve(result.value):new P(function(resolve){resolve(result.value)}).then(fulfilled,rejected)}step((generator=generator.apply(thisArg,_arguments||[])).next())})},__generator=this&&this.__generator||function(thisArg,body){var f,y,t,g,_={label:0,sent:function(){if(1&t[0])throw t[1];return t[1]},trys:[],ops:[]};return g={next:verb(0),throw:verb(1),return:verb(2)},"function"==typeof Symbol&&(g[Symbol.iterator]=function(){return this}),g;function verb(n){return function(v){return function step(op){if(f)throw new TypeError("Generator is already executing.");for(;_;)try{if(f=1,y&&(t=2&op[0]?y.return:op[0]?y.throw||((t=y.return)&&t.call(y),0):y.next)&&!(t=t.call(y,op[1])).done)return t;switch(y=0,t&&(op=[2&op[0],t.value]),op[0]){case 0:case 1:t=op;break;case 4:return _.label++,{value:op[1],done:!1};case 5:_.label++,y=op[1],op=[0];continue;case 7:op=_.ops.pop(),_.trys.pop();continue;default:if(!(t=(t=_.trys).length>0&&t[t.length-1])&&(6===op[0]||2===op[0])){_=0;continue}if(3===op[0]&&(!t||op[1]>t[0]&&op[1]<t[3])){_.label=op[1];break}if(6===op[0]&&_.label<t[1]){_.label=t[1],t=op;break}if(t&&_.label<t[2]){_.label=t[2],_.ops.push(op);break}t[2]&&_.ops.pop(),_.trys.pop();continue}op=body.call(thisArg,_)}catch(e){op=[6,e],y=0}finally{f=t=0}if(5&op[0])throw op[1];return{value:op[0]?op[1]:void 0,done:!0}}([n,v])}}},__importDefault=this&&this.__importDefault||function(mod){return mod&&mod.__esModule?mod:{default:mod}};Object.defineProperty(exports,"__esModule",{value:!0});var lodash_get_1=__importDefault(__webpack_require__(224)),lodash_set_1=__importDefault(__webpack_require__(505)),short_uuid_1=__importDefault(__webpack_require__(227)),helpers_1=__webpack_require__(134),types_1=__webpack_require__(135);function createRPC(_callName,_connectionID,event,listeners,guest){return void 0===listeners&&(listeners=[]),function(){for(var args=[],_i=0;_i<arguments.length;_i++)args[_i]=arguments[_i];return new Promise(function(resolve,reject){var callID=short_uuid_1.default.generate();function handleResponse(event){var _a=event.data,callID=_a.callID,connectionID=_a.connectionID,callName=_a.callName,result=_a.result,error=_a.error,action=_a.action;if(helpers_1.isTrustedRemote(event)&&callID&&callName&&callName===_callName&&connectionID===_connectionID)return action===types_1.actions.RPC_RESOLVE?resolve(result):action===types_1.actions.RPC_REJECT?reject(error):void 0}var payload={action:types_1.actions.RPC_REQUEST,args:JSON.parse(JSON.stringify(args)),callID:callID,callName:_callName,connectionID:_connectionID};guest?guest.addEventListener(types_1.events.MESSAGE,handleResponse):self.addEventListener(types_1.events.MESSAGE,handleResponse),listeners.push(function(){return self.removeEventListener(types_1.events.MESSAGE,handleResponse)}),guest?guest.postMessage(payload):helpers_1.isWorker()?self.postMessage(payload):event.source.postMessage(payload,event.origin)})}}exports.registerLocalMethods=function registerLocalMethods(schema,methods,_connectionID,guest){void 0===schema&&(schema={}),void 0===methods&&(methods=[]);var listeners=[];return methods.forEach(function(methodName){function handleCall(event){return __awaiter(this,void 0,void 0,function(){var _a,action,callID,connectionID,callName,_b,args,payload,result,error_1;return __generator(this,function(_c){switch(_c.label){case 0:if(_a=event.data,action=_a.action,callID=_a.callID,connectionID=_a.connectionID,callName=_a.callName,_b=_a.args,args=void 0===_b?[]:_b,action!==types_1.actions.RPC_REQUEST)return[2];if(!helpers_1.isTrustedRemote(event))return[2];if(!callID||!callName)return[2];if(callName!==methodName)return[2];if(connectionID!==_connectionID)return[2];payload={action:types_1.actions.RPC_RESOLVE,callID:callID,callName:callName,connectionID:connectionID,result:null,error:null},_c.label=1;case 1:return _c.trys.push([1,3,,4]),[4,lodash_get_1.default(schema,methodName).apply(void 0,args)];case 2:return result=_c.sent(),payload.result=JSON.parse(JSON.stringify(result)),[3,4];case 3:return error_1=_c.sent(),payload.error=JSON.parse(JSON.stringify(error_1,Object.getOwnPropertyNames(error_1))),[3,4];case 4:return guest?guest.postMessage(payload):helpers_1.isWorker()?self.postMessage(payload):event.source.postMessage(payload,event.origin),[2]}})})}guest?guest.addEventListener(types_1.events.MESSAGE,handleCall):self.addEventListener(types_1.events.MESSAGE,handleCall),listeners.push(function(){return self.removeEventListener(types_1.events.MESSAGE,handleCall)})}),function(){return listeners.forEach(function(unregister){return unregister()})}},exports.registerRemoteMethods=function registerRemoteMethods(schema,methods,_connectionID,event,guest){void 0===schema&&(schema={}),void 0===methods&&(methods=[]);var remote=Object.assign({},schema),listeners=[];return methods.forEach(function(methodName){var rpc=createRPC(methodName,_connectionID,event,listeners,guest);lodash_set_1.default(remote,methodName,rpc)}),{remote:remote,unregisterRemote:function(){return listeners.forEach(function(unregister){return unregister()})}}},exports.createRPC=createRPC},229:function(module,exports,__webpack_require__){"use strict";var __importDefault=this&&this.__importDefault||function(mod){return mod&&mod.__esModule?mod:{default:mod}};Object.defineProperty(exports,"__esModule",{value:!0});var guest_1=__importDefault(__webpack_require__(504));exports.guest=guest_1.default;var host_1=__importDefault(__webpack_require__(511));exports.host=host_1.default},234:function(module,exports,__webpack_require__){__webpack_require__(235),__webpack_require__(338),module.exports=__webpack_require__(339)},339:function(module,__webpack_exports__,__webpack_require__){"use strict";__webpack_require__.r(__webpack_exports__),function(module){__webpack_require__(32),__webpack_require__(22),__webpack_require__(20),__webpack_require__(33),__webpack_require__(28);var _storybook_react__WEBPACK_IMPORTED_MODULE_5__=__webpack_require__(93),req=__webpack_require__(501);Object(_storybook_react__WEBPACK_IMPORTED_MODULE_5__.configure)(function loadStories(){req.keys().forEach(function(filename){return req(filename)})},module)}.call(this,__webpack_require__(169)(module))},501:function(module,exports,__webpack_require__){var map={"./index.stories.js":502};function webpackContext(req){var id=webpackContextResolve(req);return __webpack_require__(id)}function webpackContextResolve(req){if(!__webpack_require__.o(map,req)){var e=new Error("Cannot find module '"+req+"'");throw e.code="MODULE_NOT_FOUND",e}return map[req]}webpackContext.keys=function webpackContextKeys(){return Object.keys(map)},webpackContext.resolve=webpackContextResolve,module.exports=webpackContext,webpackContext.id=501},502:function(module,__webpack_exports__,__webpack_require__){"use strict";__webpack_require__.r(__webpack_exports__),function(module){__webpack_require__(26),__webpack_require__(27),__webpack_require__(31),__webpack_require__(40),__webpack_require__(22),__webpack_require__(81),__webpack_require__(131),__webpack_require__(132),__webpack_require__(20),__webpack_require__(222),__webpack_require__(34),__webpack_require__(28),__webpack_require__(503);var react__WEBPACK_IMPORTED_MODULE_13__=__webpack_require__(0),react__WEBPACK_IMPORTED_MODULE_13___default=__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_13__),_storybook_react__WEBPACK_IMPORTED_MODULE_14__=__webpack_require__(93),styled_components__WEBPACK_IMPORTED_MODULE_15__=__webpack_require__(136),_src_index__WEBPACK_IMPORTED_MODULE_16__=__webpack_require__(229);function asyncGeneratorStep(gen,resolve,reject,_next,_throw,key,arg){try{var info=gen[key](arg),value=info.value}catch(error){return void reject(error)}info.done?resolve(value):Promise.resolve(value).then(_next,_throw)}function _slicedToArray(arr,i){return function _arrayWithHoles(arr){if(Array.isArray(arr))return arr}(arr)||function _iterableToArrayLimit(arr,i){var _arr=[],_n=!0,_d=!1,_e=void 0;try{for(var _s,_i=arr[Symbol.iterator]();!(_n=(_s=_i.next()).done)&&(_arr.push(_s.value),!i||_arr.length!==i);_n=!0);}catch(err){_d=!0,_e=err}finally{try{_n||null==_i.return||_i.return()}finally{if(_d)throw _e}}return _arr}(arr,i)||function _nonIterableRest(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}()}function _templateObject2(){var data=_taggedTemplateLiteral(["\n  height: 240px;\n  width: 240px;\n  border: none;\n"]);return _templateObject2=function(){return data},data}function _templateObject(){var data=_taggedTemplateLiteral(["\n  display: flex;\n  flex-direction: column;\n  max-width: 42rem;\n  margin: 0 auto;\n  padding: 1rem;\n  font-family: Oswald, sans-serif;\n\n  button {\n    width: 120px;\n  }\n"]);return _templateObject=function(){return data},data}function _taggedTemplateLiteral(strings,raw){return raw||(raw=strings.slice(0)),Object.freeze(Object.defineProperties(strings,{raw:{value:Object.freeze(raw)}}))}var Background=styled_components__WEBPACK_IMPORTED_MODULE_15__.a.div(_templateObject()),Iframe=styled_components__WEBPACK_IMPORTED_MODULE_15__.a.iframe(_templateObject2());var _ref2=react__WEBPACK_IMPORTED_MODULE_13___default.a.createElement("h1",null,"HOST");function Demo(){var iframe=react__WEBPACK_IMPORTED_MODULE_13___default.a.useRef(null),_React$useState2=_slicedToArray(react__WEBPACK_IMPORTED_MODULE_13___default.a.useState(),2),color=_React$useState2[0],setColor=_React$useState2[1],_React$useState4=_slicedToArray(react__WEBPACK_IMPORTED_MODULE_13___default.a.useState(),2),connection=_React$useState4[0],setConnection=_React$useState4[1];return react__WEBPACK_IMPORTED_MODULE_13___default.a.useEffect(function(){!function _asyncToGenerator(fn){return function(){var self=this,args=arguments;return new Promise(function(resolve,reject){function _next(value){asyncGeneratorStep(gen,resolve,reject,_next,_throw,"next",value)}function _throw(err){asyncGeneratorStep(gen,resolve,reject,_next,_throw,"throw",err)}var gen=fn.apply(self,args);_next(void 0)})}}(regeneratorRuntime.mark(function _callee(){var _connection;return regeneratorRuntime.wrap(function(_context){for(;;)switch(_context.prev=_context.next){case 0:return _context.next=2,_src_index__WEBPACK_IMPORTED_MODULE_16__.host.connect(iframe.current,{setColor:setColor});case 2:_connection=_context.sent,setConnection(_connection);case 4:case"end":return _context.stop()}},_callee)}))()},[]),react__WEBPACK_IMPORTED_MODULE_13___default.a.createElement(Background,{style:{background:color}},react__WEBPACK_IMPORTED_MODULE_13___default.a.createElement("div",{style:{flex:1}},_ref2,react__WEBPACK_IMPORTED_MODULE_13___default.a.createElement("button",{onClick:function onClick(){return connection.remote.setColor(function makeRandomColor(){for(var color="#",i=0;6>i;i++)color+="0123456789ABCDEF"[Math.floor(16*Math.random())];return color}())}},"call guest")),react__WEBPACK_IMPORTED_MODULE_13___default.a.createElement("div",{style:{marginTop:"1rem"}},react__WEBPACK_IMPORTED_MODULE_13___default.a.createElement(Iframe,{title:"guest",ref:iframe,src:"https://storage.googleapis.com/m.au-re.com/static/index.html",sandbox:"allow-same-origin allow-scripts"})))}Demo.displayName="Demo";var _ref3=react__WEBPACK_IMPORTED_MODULE_13___default.a.createElement(Demo,null);Object(_storybook_react__WEBPACK_IMPORTED_MODULE_14__.storiesOf)("rimless",module).add("iframe communication",function(){return _ref3})}.call(this,__webpack_require__(169)(module))},504:function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var helpers_1=__webpack_require__(134),rpc_1=__webpack_require__(226),types_1=__webpack_require__(135);exports.default={connect:function connect(schema,options){return void 0===schema&&(schema={}),void 0===options&&(options={}),new Promise(function(resolve,reject){var localMethods=helpers_1.extractMethods(schema);self.addEventListener(types_1.events.MESSAGE,function handleHandshakeResponse(event){if(event.data.action===types_1.actions.HANDSHAKE_REPLY){var unregisterLocal=rpc_1.registerLocalMethods(schema,localMethods,event.data.connectionID),_a=rpc_1.registerRemoteMethods(event.data.schema,event.data.methods,event.data.connectionID,event),remote=_a.remote,unregisterRemote=_a.unregisterRemote;return resolve({remote:remote,close:function(){self.removeEventListener(types_1.events.MESSAGE,handleHandshakeResponse),unregisterRemote(),unregisterLocal()}})}});var payload={action:types_1.actions.HANDSHAKE_REQUEST,methods:localMethods,schema:JSON.parse(JSON.stringify(schema))};helpers_1.isWorker()?self.postMessage(payload):window.parent.postMessage(payload,"*")})}}},511:function(module,exports,__webpack_require__){"use strict";var __importDefault=this&&this.__importDefault||function(mod){return mod&&mod.__esModule?mod:{default:mod}};Object.defineProperty(exports,"__esModule",{value:!0});var short_uuid_1=__importDefault(__webpack_require__(227)),helpers_1=__webpack_require__(134),rpc_1=__webpack_require__(226),types_1=__webpack_require__(135),connections={};exports.default={connect:function connect(guest,schema,options){if(void 0===schema&&(schema={}),!guest)throw new Error("a target is required");var guestIsWorker=void 0!==guest.onerror&&void 0!==guest.onmessage,listeners=guestIsWorker?guest:window;return new Promise(function(resolve,reject){var connectionID=short_uuid_1.default.generate();listeners.addEventListener(types_1.events.MESSAGE,function handleHandshake(event){if((guestIsWorker||function isValidTarget(iframe,event){var childURL=iframe.getAttribute("src"),childOrigin=helpers_1.getOriginFromURL(childURL),hasProperOrigin=event.origin===childOrigin,hasProperSource=event.source===iframe.contentWindow;return hasProperOrigin&&hasProperSource}(guest,event))&&event.data.action===types_1.actions.HANDSHAKE_REQUEST){var localMethods=helpers_1.extractMethods(schema),unregisterLocal=rpc_1.registerLocalMethods(schema,localMethods,connectionID,guestIsWorker?guest:void 0),_a=rpc_1.registerRemoteMethods(event.data.schema,event.data.methods,connectionID,event,guestIsWorker?guest:void 0),remote=_a.remote,unregisterRemote=_a.unregisterRemote,payload={action:types_1.actions.HANDSHAKE_REPLY,connectionID:connectionID,methods:localMethods,schema:JSON.parse(JSON.stringify(schema))};guestIsWorker?guest.postMessage(payload):event.source.postMessage(payload,event.origin);var connection={remote:remote,close:function(){listeners.removeEventListener(types_1.events.MESSAGE,handleHandshake),unregisterRemote(),unregisterLocal()}};return connections[connectionID]=connection,resolve(connection)}})})}}}},[[234,1,2]]]);
//# sourceMappingURL=main.5e05e144c36263625e1f.bundle.js.map