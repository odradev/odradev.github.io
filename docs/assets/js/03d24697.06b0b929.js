"use strict";(self.webpackChunkodra_website=self.webpackChunkodra_website||[]).push([[45333],{3905:(e,t,n)=>{n.d(t,{Zo:()=>c,kt:()=>m});var a=n(67294);function r(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function s(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function o(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?s(Object(n),!0).forEach((function(t){r(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):s(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function i(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},s=Object.keys(e);for(a=0;a<s.length;a++)n=s[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(a=0;a<s.length;a++)n=s[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var u=a.createContext({}),l=function(e){var t=a.useContext(u),n=t;return e&&(n="function"==typeof e?e(t):o(o({},t),e)),n},c=function(e){var t=l(e.components);return a.createElement(u.Provider,{value:t},e.children)},d={inlineCode:"code",wrapper:function(e){var t=e.children;return a.createElement(a.Fragment,{},t)}},p=a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,s=e.originalType,u=e.parentName,c=i(e,["components","mdxType","originalType","parentName"]),p=l(n),m=r,f=p["".concat(u,".").concat(m)]||p[m]||d[m]||s;return n?a.createElement(f,o(o({ref:t},c),{},{components:n})):a.createElement(f,o({ref:t},c))}));function m(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var s=n.length,o=new Array(s);o[0]=p;var i={};for(var u in t)hasOwnProperty.call(t,u)&&(i[u]=t[u]);i.originalType=e,i.mdxType="string"==typeof e?e:r,o[1]=i;for(var l=2;l<s;l++)o[l]=n[l];return a.createElement.apply(null,o)}return a.createElement.apply(null,n)}p.displayName="MDXCreateElement"},9887:(e,t,n)=>{n.r(t),n.d(t,{assets:()=>u,contentTitle:()=>o,default:()=>d,frontMatter:()=>s,metadata:()=>i,toc:()=>l});var a=n(87462),r=(n(67294),n(3905));const s={sidebar_position:5},o="Pausable",i={unversionedId:"tutorials/pauseable",id:"version-0.7.0/tutorials/pauseable",title:"Pausable",description:"The Pausable module is like your smart contract's safety switch. It lets authorized users temporarily pause certain features if needed. It's a great way to boost security, but it's not meant to be used on its own. Think of it as an extra tool in your access control toolbox, giving you more control to manage your smart contract safely and efficiently.",source:"@site/versioned_docs/version-0.7.0/tutorials/pauseable.md",sourceDirName:"tutorials",slug:"/tutorials/pauseable",permalink:"/docs/0.7.0/tutorials/pauseable",draft:!1,tags:[],version:"0.7.0",lastUpdatedAt:1711523026,formattedLastUpdatedAt:"Mar 27, 2024",sidebarPosition:5,frontMatter:{sidebar_position:5},sidebar:"tutorialSidebar",previous:{title:"Access Control",permalink:"/docs/0.7.0/tutorials/access-control"}},u={},l=[{value:"Code",id:"code",level:2},{value:"Events and Error",id:"events-and-error",level:3},{value:"Module definition",id:"module-definition",level:3},{value:"Checks and guards",id:"checks-and-guards",level:3},{value:"Actions",id:"actions",level:3},{value:"Pausable counter",id:"pausable-counter",level:2}],c={toc:l};function d(e){let{components:t,...n}=e;return(0,r.kt)("wrapper",(0,a.Z)({},c,n,{components:t,mdxType:"MDXLayout"}),(0,r.kt)("h1",{id:"pausable"},"Pausable"),(0,r.kt)("p",null,"The ",(0,r.kt)("inlineCode",{parentName:"p"},"Pausable")," module is like your smart contract's safety switch. It lets authorized users temporarily pause certain features if needed. It's a great way to boost security, but it's not meant to be used on its own. Think of it as an extra tool in your access control toolbox, giving you more control to manage your smart contract safely and efficiently."),(0,r.kt)("h2",{id:"code"},"Code"),(0,r.kt)("p",null,"As always, we will start with defining functionalities of our module."),(0,r.kt)("ol",null,(0,r.kt)("li",{parentName:"ol"},"Check the state - is it paused or not."),(0,r.kt)("li",{parentName:"ol"},"State guards - a contract should stop execution if is in a state we don't expect."),(0,r.kt)("li",{parentName:"ol"},"Switch the state.")),(0,r.kt)("h3",{id:"events-and-error"},"Events and Error"),(0,r.kt)("p",null,"There just two errors that may occur: ",(0,r.kt)("inlineCode",{parentName:"p"},"PausedRequired"),", ",(0,r.kt)("inlineCode",{parentName:"p"},"UnpausedRequired"),". We define them in a standard Odra way."),(0,r.kt)("p",null,"Events definition is highly uncomplicated: ",(0,r.kt)("inlineCode",{parentName:"p"},"Paused")," and ",(0,r.kt)("inlineCode",{parentName:"p"},"Unpaused")," events holds only the address of the pauser."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-rust",metastring:"showLineNumbers",showLineNumbers:!0},"use odra::{Event, types::Address};\n\nodra::execution_error! {\n    pub enum Error {\n        PausedRequired => 1_000,\n        UnpausedRequired => 1_001,\n    }\n}\n\n#[derive(Event, PartialEq, Eq, Debug)]\npub struct Paused {\n    pub account: Address\n}\n\n#[derive(Event, PartialEq, Eq, Debug)]\npub struct Unpaused {\n    pub account: Address\n}\n")),(0,r.kt)("h3",{id:"module-definition"},"Module definition"),(0,r.kt)("p",null,"The module storage is extremely simple - has a single ",(0,r.kt)("inlineCode",{parentName:"p"},"Variable")," of type bool, that indicates if a contract is paused."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-rust",metastring:"showLineNumbers",showLineNumbers:!0},"#[odra::module]\npub struct Pausable {\n    is_paused: Variable<bool>\n}\n")),(0,r.kt)("h3",{id:"checks-and-guards"},"Checks and guards"),(0,r.kt)("p",null,"Now, let's move to state checks and guards."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-rust",metastring:"title=pauseable.rs showLineNumbers",title:"pauseable.rs",showLineNumbers:!0},"impl Pausable {\n    pub fn is_paused(&self) -> bool {\n        self.is_paused.get_or_default()\n    }\n\n    pub fn require_not_paused(&self) {\n        if self.is_paused() {\n            contract_env::revert(Error::UnpausedRequired);\n        }\n    }\n\n    pub fn require_paused(&self) {\n        if !self.is_paused() {\n            contract_env::revert(Error::PausedRequired);\n        }\n    }\n}\n")),(0,r.kt)("ul",null,(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("strong",{parentName:"li"},"L1")," - as mentioned in the intro, the module is not intended to be a standalone contract, so the only ",(0,r.kt)("inlineCode",{parentName:"li"},"impl")," block is not annotated with ",(0,r.kt)("inlineCode",{parentName:"li"},"odra::module")," and hence does not expose any entrypoint."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("strong",{parentName:"li"},"L2")," - ",(0,r.kt)("inlineCode",{parentName:"li"},"is_paused()")," checks the contract state, if the Variable ",(0,r.kt)("inlineCode",{parentName:"li"},"is_paused")," has not been initialized, the default value (false) is returned."),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("strong",{parentName:"li"},"L6")," - to guarantee the code is executed when the contract is not paused, ",(0,r.kt)("inlineCode",{parentName:"li"},"require_not_paused()")," function reads the state and reverts if the contract is paused. "),(0,r.kt)("li",{parentName:"ul"},(0,r.kt)("strong",{parentName:"li"},"L12")," - ",(0,r.kt)("inlineCode",{parentName:"li"},"require_paused()")," is a mirror function - stops the contract execution if the contract is not paused.")),(0,r.kt)("h3",{id:"actions"},"Actions"),(0,r.kt)("p",null,"Finally, we will add the ability to switch the module state."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-rust",metastring:"showLineNumbers",showLineNumbers:!0},"impl Pausable {\n    pub fn pause(&mut self) {\n        self.require_not_paused();\n        self.is_paused.set(true);\n\n        Paused {\n            account: contract_env::caller()\n        }\n        .emit();\n    }\n\n    pub fn unpause(&mut self) {\n        self.require_paused();\n        self.is_paused.set(false);\n\n        Unpaused {\n            account: contract_env::caller()\n        }\n        .emit();\n    }\n}\n")),(0,r.kt)("p",null,(0,r.kt)("inlineCode",{parentName:"p"},"pause()")," and ",(0,r.kt)("inlineCode",{parentName:"p"},"unpause()")," functions do three things: ensure the contract is the right state (unpaused for ",(0,r.kt)("inlineCode",{parentName:"p"},"pause()"),", not paused for ",(0,r.kt)("inlineCode",{parentName:"p"},"unpause()"),"), updates the state, and finally emits events (",(0,r.kt)("inlineCode",{parentName:"p"},"Paused"),"/",(0,r.kt)("inlineCode",{parentName:"p"},"Unpaused"),")."),(0,r.kt)("h2",{id:"pausable-counter"},"Pausable counter"),(0,r.kt)("p",null,"In the end, let's use the module in a contract. For this purpose, we will implement a mock contract called ",(0,r.kt)("inlineCode",{parentName:"p"},"PausableCounter"),". The contract consists of a Variable ",(0,r.kt)("inlineCode",{parentName:"p"},"value")," and a ",(0,r.kt)("inlineCode",{parentName:"p"},"Pausable")," module. The counter can only be incremented if the contract is in a normal state (is not paused)."),(0,r.kt)("pre",null,(0,r.kt)("code",{parentName:"pre",className:"language-rust",metastring:"showLineNumbers",showLineNumbers:!0},"use odra::Variable;\nuse odra_modules::security::Pausable;\n\n#[odra::module]\npub struct PausableCounter {\n    value: Variable<u32>,\n    pauseable: Pausable\n}\n\n#[odra::module]\nimpl PausableCounter {\n    pub fn increment(&mut self) {\n        self.pauseable.require_not_paused();\n\n        let new_value = self.value.get_or_default() + 1;\n        self.value.set(new_value);\n    }\n\n    pub fn pause(&mut self) {\n        self.pauseable.pause();\n    }\n\n    pub fn unpause(&mut self) {\n        self.pauseable.unpause();\n    }\n\n    pub fn get_value(&self) -> u32 {\n        self.value.get_or_default()\n    }\n}\n\n#[cfg(test)]\nmod test {\n    use super::PausableCounterDeployer;\n    use odra_modules::security::errors::Error;\n\n    #[test]\n    fn increment_only_if_unpaused() {\n        let mut contract = PausableCounterDeployer::default();\n        assert_eq!(contract.get_value(), 0);\n\n        contract.increment();\n        assert_eq!(contract.get_value(), 1);\n        \n        contract.pause();\n        odra::test_env::assert_exception(\n            Error::UnpausedRequired, \n            || contract.increment()\n        );\n        assert_eq!(contract.get_value(), 1);\n\n        contract.unpause();\n        contract.increment();\n        assert_eq!(contract.get_value(), 2);\n\n    }\n}\n")),(0,r.kt)("p",null,"As we see in the test, in a simple way, using a single function call we can turn off the counter for a while and freeze the counter. Any time we want we can turn it back on. Easy!"))}d.isMDXComponent=!0}}]);