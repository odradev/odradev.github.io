"use strict";(self.webpackChunkodra_website=self.webpackChunkodra_website||[]).push([[21389],{3905:(e,t,a)=>{a.d(t,{Zo:()=>p,kt:()=>g});var r=a(67294);function n(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function o(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,r)}return a}function l(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?o(Object(a),!0).forEach((function(t){n(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):o(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function i(e,t){if(null==e)return{};var a,r,n=function(e,t){if(null==e)return{};var a,r,n={},o=Object.keys(e);for(r=0;r<o.length;r++)a=o[r],t.indexOf(a)>=0||(n[a]=e[a]);return n}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)a=o[r],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(n[a]=e[a])}return n}var s=r.createContext({}),c=function(e){var t=r.useContext(s),a=t;return e&&(a="function"==typeof e?e(t):l(l({},t),e)),a},p=function(e){var t=c(e.components);return r.createElement(s.Provider,{value:t},e.children)},u={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},d=r.forwardRef((function(e,t){var a=e.components,n=e.mdxType,o=e.originalType,s=e.parentName,p=i(e,["components","mdxType","originalType","parentName"]),d=c(a),g=n,m=d["".concat(s,".").concat(g)]||d[g]||u[g]||o;return a?r.createElement(m,l(l({ref:t},p),{},{components:a})):r.createElement(m,l({ref:t},p))}));function g(e,t){var a=arguments,n=t&&t.mdxType;if("string"==typeof e||n){var o=a.length,l=new Array(o);l[0]=d;var i={};for(var s in t)hasOwnProperty.call(t,s)&&(i[s]=t[s]);i.originalType=e,i.mdxType="string"==typeof e?e:n,l[1]=i;for(var c=2;c<o;c++)l[c]=a[c];return r.createElement.apply(null,l)}return r.createElement.apply(null,a)}d.displayName="MDXCreateElement"},10296:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>s,contentTitle:()=>l,default:()=>u,frontMatter:()=>o,metadata:()=>i,toc:()=>c});var r=a(87462),n=(a(67294),a(3905));const o={sidebar_position:1},l="Installation",i={unversionedId:"getting-started/installation",id:"version-0.6.0/getting-started/installation",title:"Installation",description:"Hello fellow Odra user! This page will guide you through the installation process.",source:"@site/versioned_docs/version-0.6.0/getting-started/installation.md",sourceDirName:"getting-started",slug:"/getting-started/installation",permalink:"/docs/0.6.0/getting-started/installation",draft:!1,tags:[],version:"0.6.0",lastUpdatedAt:1699367878,formattedLastUpdatedAt:"Nov 7, 2023",sidebarPosition:1,frontMatter:{sidebar_position:1},sidebar:"tutorialSidebar",previous:{title:"Getting started",permalink:"/docs/0.6.0/category/getting-started"},next:{title:"Flipper example",permalink:"/docs/0.6.0/getting-started/flipper"}},s={},c=[{value:"Prerequisites",id:"prerequisites",level:2},{value:"Installing Cargo Odra",id:"installing-cargo-odra",level:2},{value:"Creating a new Odra project",id:"creating-a-new-odra-project",level:2},{value:"What&#39;s next?",id:"whats-next",level:2}],p={toc:c};function u(e){let{components:t,...a}=e;return(0,n.kt)("wrapper",(0,r.Z)({},p,a,{components:t,mdxType:"MDXLayout"}),(0,n.kt)("h1",{id:"installation"},"Installation"),(0,n.kt)("p",null,"Hello fellow Odra user! This page will guide you through the installation process."),(0,n.kt)("h2",{id:"prerequisites"},"Prerequisites"),(0,n.kt)("p",null,"To start working with Odra, you need to have the following installed on your machine:"),(0,n.kt)("ul",null,(0,n.kt)("li",{parentName:"ul"},"Rust toolchain installed (see ",(0,n.kt)("a",{parentName:"li",href:"https://rustup.rs/"},"rustup.rs"),")"),(0,n.kt)("li",{parentName:"ul"},"wasmstrip tool installed (see ",(0,n.kt)("a",{parentName:"li",href:"https://github.com/WebAssembly/wabt"},"wabt"),")")),(0,n.kt)("p",null,"We do not provide exact commands for installing these tools, as they are different for different operating systems.\nPlease refer to the documentation of the tools themselves."),(0,n.kt)("p",null,"With Rust toolchain ready, you can add a new target:"),(0,n.kt)("pre",null,(0,n.kt)("code",{parentName:"pre",className:"language-bash"},"rustup target add wasm32-unknown-unknown\n")),(0,n.kt)("admonition",{type:"note"},(0,n.kt)("p",{parentName:"admonition"},(0,n.kt)("inlineCode",{parentName:"p"},"wasm32-unknown-uknown")," is a target that will be used by Odra to compile your smart contracts to WASM files.")),(0,n.kt)("h2",{id:"installing-cargo-odra"},"Installing Cargo Odra"),(0,n.kt)("p",null,"Cargo Odra is a helpful tool that will help you to build and test your smart contracts.\nIt is not required to use Odra, but the documentation will assume that you have it installed."),(0,n.kt)("p",null,"To install it, simply execute the following command:"),(0,n.kt)("pre",null,(0,n.kt)("code",{parentName:"pre",className:"language-bash"},"cargo install cargo-odra\n")),(0,n.kt)("p",null,"To check if it was installed correctly and see available commands, type:"),(0,n.kt)("pre",null,(0,n.kt)("code",{parentName:"pre",className:"language-bash"},"cargo odra --help\n")),(0,n.kt)("p",null,"If everything went fine, we can proceed to the next step."),(0,n.kt)("h2",{id:"creating-a-new-odra-project"},"Creating a new Odra project"),(0,n.kt)("p",null,"To create a new project, simply execute:"),(0,n.kt)("pre",null,(0,n.kt)("code",{parentName:"pre",className:"language-bash"},"cargo odra new --name my-project && cd my_project\n")),(0,n.kt)("p",null,'This will create a new folder called "my_project" and initialize Odra there. Cargo Odra\nwill create a sample contract for you in src directory. You can run the tests of this contract\nby executing:'),(0,n.kt)("pre",null,(0,n.kt)("code",{parentName:"pre",className:"language-bash"},"cargo odra test\n")),(0,n.kt)("p",null,"This will run tests using Odra's internal MockVM. You can run those tests against a real backend, let's use CasperVM:"),(0,n.kt)("pre",null,(0,n.kt)("code",{parentName:"pre",className:"language-bash"},"cargo odra test -b casper\n")),(0,n.kt)("p",null,(0,n.kt)("strong",{parentName:"p"},"Congratulations!")," Now you are ready to create contracts using Odra framework! If you had any problems during\nthe installation process, feel free to ask for help on our ",(0,n.kt)("a",{parentName:"p",href:"https://discord.com/invite/Mm5ABc9P8k"},"Discord"),"."),(0,n.kt)("h2",{id:"whats-next"},"What's next?"),(0,n.kt)("p",null,"If you want to see the code that you just tested, continue to the description of ",(0,n.kt)("a",{parentName:"p",href:"flipper"},"Flipper example"),"."))}u.isMDXComponent=!0}}]);