"use strict";(self.webpackChunkodra_website=self.webpackChunkodra_website||[]).push([[91457],{3905:(e,t,n)=>{n.d(t,{Zo:()=>p,kt:()=>m});var r=n(67294);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function o(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function i(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?o(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function l(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},o=Object.keys(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var c=r.createContext({}),s=function(e){var t=r.useContext(c),n=t;return e&&(n="function"==typeof e?e(t):i(i({},t),e)),n},p=function(e){var t=s(e.components);return r.createElement(c.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},u=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,o=e.originalType,c=e.parentName,p=l(e,["components","mdxType","originalType","parentName"]),u=s(n),m=a,f=u["".concat(c,".").concat(m)]||u[m]||d[m]||o;return n?r.createElement(f,i(i({ref:t},p),{},{components:n})):r.createElement(f,i({ref:t},p))}));function m(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var o=n.length,i=new Array(o);i[0]=u;var l={};for(var c in t)hasOwnProperty.call(t,c)&&(l[c]=t[c]);l.originalType=e,l.mdxType="string"==typeof e?e:a,i[1]=l;for(var s=2;s<o;s++)i[s]=n[s];return r.createElement.apply(null,i)}return r.createElement.apply(null,n)}u.displayName="MDXCreateElement"},30335:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>c,contentTitle:()=>i,default:()=>d,frontMatter:()=>o,metadata:()=>l,toc:()=>s});var r=n(87462),a=(n(67294),n(3905));const o={sidebar_position:3,description:"Odra's configuration file"},i="Odra.toml",l={unversionedId:"basics/odra-toml",id:"version-1.0.0/basics/odra-toml",title:"Odra.toml",description:"Odra's configuration file",source:"@site/versioned_docs/version-1.0.0/basics/03-odra-toml.md",sourceDirName:"basics",slug:"/basics/odra-toml",permalink:"/docs/1.0.0/basics/odra-toml",draft:!1,tags:[],version:"1.0.0",lastUpdatedAt:1716473940,formattedLastUpdatedAt:"May 23, 2024",sidebarPosition:3,frontMatter:{sidebar_position:3,description:"Odra's configuration file"},sidebar:"tutorialSidebar",previous:{title:"Directory structure",permalink:"/docs/1.0.0/basics/directory-structure"},next:{title:"Flipper Internals",permalink:"/docs/1.0.0/basics/flipper-internals"}},c={},s=[{value:"Adding a new contract manually",id:"adding-a-new-contract-manually",level:2},{value:"What&#39;s next",id:"whats-next",level:2}],p={toc:s};function d(e){let{components:t,...n}=e;return(0,a.kt)("wrapper",(0,r.Z)({},p,n,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"odratoml"},"Odra.toml"),(0,a.kt)("p",null,"As mentioned in the previous article, ",(0,a.kt)("inlineCode",{parentName:"p"},"Odra.toml")," is a file that contains information about all the contracts\nthat Odra will build. Let's take a look at the file structure again:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-toml"},'[[contracts]]\nfqn = "sample::Flipper"\n')),(0,a.kt)("p",null,"The ",(0,a.kt)("inlineCode",{parentName:"p"},"fqn")," (Fully Qualified Name) is used by the building tools to locate and build the contract.\nThe last segment of the ",(0,a.kt)("inlineCode",{parentName:"p"},"fqn")," will be used as the name for your contract - the generated wasm file will\nbe in the above case named ",(0,a.kt)("inlineCode",{parentName:"p"},"flipper.wasm"),"."),(0,a.kt)("h2",{id:"adding-a-new-contract-manually"},"Adding a new contract manually"),(0,a.kt)("p",null,"Besides using the ",(0,a.kt)("inlineCode",{parentName:"p"},"cargo odra generate")," command, you can add a new contract to be compiled by hand.\nTo do this, add another ",(0,a.kt)("inlineCode",{parentName:"p"},"[[contracts]]")," element, name it and make sure that the ",(0,a.kt)("inlineCode",{parentName:"p"},"fqn")," is set correctly."),(0,a.kt)("p",null,"For example, if you want to create a new contract called ",(0,a.kt)("inlineCode",{parentName:"p"},"counter"),", your ",(0,a.kt)("inlineCode",{parentName:"p"},"Odra.toml")," file should finally\nlook like this:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-toml"},'[[contracts]]\nfqn = "sample::Flipper"\n\n[[contracts]]\nfqn = "sample::Counter"\n')),(0,a.kt)("h2",{id:"whats-next"},"What's next"),(0,a.kt)("p",null,"In the next section, we'll take a closer look at the code that was generated by Odra by default - the famous\n",(0,a.kt)("inlineCode",{parentName:"p"},"Flipper")," contract."))}d.isMDXComponent=!0}}]);