"use strict";(self.webpackChunkodra_website=self.webpackChunkodra_website||[]).push([[14018],{3905:(e,r,n)=>{n.d(r,{Zo:()=>c,kt:()=>m});var t=n(67294);function a(e,r,n){return r in e?Object.defineProperty(e,r,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[r]=n,e}function o(e,r){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var t=Object.getOwnPropertySymbols(e);r&&(t=t.filter((function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable}))),n.push.apply(n,t)}return n}function s(e){for(var r=1;r<arguments.length;r++){var n=null!=arguments[r]?arguments[r]:{};r%2?o(Object(n),!0).forEach((function(r){a(e,r,n[r])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):o(Object(n)).forEach((function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(n,r))}))}return e}function i(e,r){if(null==e)return{};var n,t,a=function(e,r){if(null==e)return{};var n,t,a={},o=Object.keys(e);for(t=0;t<o.length;t++)n=o[t],r.indexOf(n)>=0||(a[n]=e[n]);return a}(e,r);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(t=0;t<o.length;t++)n=o[t],r.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var l=t.createContext({}),p=function(e){var r=t.useContext(l),n=r;return e&&(n="function"==typeof e?e(r):s(s({},r),e)),n},c=function(e){var r=p(e.components);return t.createElement(l.Provider,{value:r},e.children)},u={inlineCode:"code",wrapper:function(e){var r=e.children;return t.createElement(t.Fragment,{},r)}},d=t.forwardRef((function(e,r){var n=e.components,a=e.mdxType,o=e.originalType,l=e.parentName,c=i(e,["components","mdxType","originalType","parentName"]),d=p(n),m=a,f=d["".concat(l,".").concat(m)]||d[m]||u[m]||o;return n?t.createElement(f,s(s({ref:r},c),{},{components:n})):t.createElement(f,s({ref:r},c))}));function m(e,r){var n=arguments,a=r&&r.mdxType;if("string"==typeof e||a){var o=n.length,s=new Array(o);s[0]=d;var i={};for(var l in r)hasOwnProperty.call(r,l)&&(i[l]=r[l]);i.originalType=e,i.mdxType="string"==typeof e?e:a,s[1]=i;for(var p=2;p<o;p++)s[p]=n[p];return t.createElement.apply(null,s)}return t.createElement.apply(null,n)}d.displayName="MDXCreateElement"},21466:(e,r,n)=>{n.r(r),n.d(r,{assets:()=>l,contentTitle:()=>s,default:()=>u,frontMatter:()=>o,metadata:()=>i,toc:()=>p});var t=n(87462),a=(n(67294),n(3905));const o={sidebar_position:8,description:"Causing and handling errors"},s="Errors",i={unversionedId:"basics/errors",id:"version-1.1.0/basics/errors",title:"Errors",description:"Causing and handling errors",source:"@site/versioned_docs/version-1.1.0/basics/08-errors.md",sourceDirName:"basics",slug:"/basics/errors",permalink:"/docs/1.1.0/basics/errors",draft:!1,tags:[],version:"1.1.0",lastUpdatedAt:1718618013,formattedLastUpdatedAt:"Jun 17, 2024",sidebarPosition:8,frontMatter:{sidebar_position:8,description:"Causing and handling errors"},sidebar:"tutorialSidebar",previous:{title:"Testing",permalink:"/docs/1.1.0/basics/testing"},next:{title:"Events",permalink:"/docs/1.1.0/basics/events"}},l={},p=[{value:"Testing errors",id:"testing-errors",level:2},{value:"What&#39;s next",id:"whats-next",level:2}],c={toc:p};function u(e){let{components:r,...n}=e;return(0,a.kt)("wrapper",(0,t.Z)({},c,n,{components:r,mdxType:"MDXLayout"}),(0,a.kt)("h1",{id:"errors"},"Errors"),(0,a.kt)("p",null,"Odra comes with tools that allow you to throw, handle and test for errors in execution. Take a look at the\nfollowing example of a simple owned contract:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-rust",metastring:'title="examples/src/features/handling_errors.rs"',title:'"examples/src/features/handling_errors.rs"'},"use odra::prelude::*;\nuse odra::{Address, Var};\n\n#[odra::module(errors = Error)]\npub struct OwnedContract {\n    name: Var<String>,\n    owner: Var<Address>\n}\n\n#[odra::odra_error]\npub enum Error {\n    OwnerNotSet = 1,\n    NotAnOwner = 2\n}\n\n#[odra::module]\nimpl OwnedContract {\n    pub fn init(&mut self, name: String) {\n        self.name.set(name);\n        self.owner.set(self.env().caller())\n    }\n\n    pub fn name(&self) -> String {\n        self.name.get_or_default()\n    }\n\n    pub fn owner(&self) -> Address {\n        self.owner.get_or_revert_with(Error::OwnerNotSet)\n    }\n\n    pub fn change_name(&mut self, name: String) {\n        let caller = self.env().caller();\n        if caller != self.owner() {\n            self.env().revert(Error::NotAnOwner)\n        }\n\n        self.name.set(name);\n    }\n}\n")),(0,a.kt)("p",null,"Firstly, we are using the ",(0,a.kt)("inlineCode",{parentName:"p"},"#[odra::odra_error]")," attribute to define our own set of Errors that our contract will\nthrow. Then, you can use those errors in your code - for example, instead of forcefully unwrapping Options, you can use\n",(0,a.kt)("inlineCode",{parentName:"p"},"unwrap_or_revert_with")," and pass an error as an argument:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-rust",metastring:'title="examples/src/features/handling_errors.rs"',title:'"examples/src/features/handling_errors.rs"'},"self.owner.get().unwrap_or_revert_with(Error::OwnerNotSet)\n")),(0,a.kt)("p",null,"You can also throw the error directly, by using ",(0,a.kt)("inlineCode",{parentName:"p"},"revert"),":"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-rust",metastring:'title="examples/src/features/handling_errors.rs"',title:'"examples/src/features/handling_errors.rs"'},"self.env().revert(Error::NotAnOwner)\n")),(0,a.kt)("p",null,"To register errors, add the ",(0,a.kt)("inlineCode",{parentName:"p"},"errors")," inner attribute to the struct's ",(0,a.kt)("inlineCode",{parentName:"p"},"#[odra::module]")," attribute and pass the error type as the value. The registered errors will be present in the contract ",(0,a.kt)("a",{parentName:"p",href:"./casper-contract-schema"},(0,a.kt)("inlineCode",{parentName:"a"},"schema")),"."),(0,a.kt)("p",null,"Defining an error in Odra, you must keep in mind a few rules:"),(0,a.kt)("ol",null,(0,a.kt)("li",{parentName:"ol"},"An error should be a field-less enum. "),(0,a.kt)("li",{parentName:"ol"},"The enum must be annotated with ",(0,a.kt)("inlineCode",{parentName:"li"},"#[odra::odra_error]"),"."),(0,a.kt)("li",{parentName:"ol"},"Avoid implicit discriminants.")),(0,a.kt)("admonition",{type:"note"},(0,a.kt)("p",{parentName:"admonition"},"In your project you can define as many error enums as you wish, but you must ensure that the discriminants are unique across the project!")),(0,a.kt)("h2",{id:"testing-errors"},"Testing errors"),(0,a.kt)("p",null,"Okay, but how about testing it? Let's write a test that will check if the error is thrown when the caller is not an owner:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-rust",metastring:'title="examples/src/features/handling_errors.rs"',title:'"examples/src/features/handling_errors.rs"'},'#[cfg(test)]\nmod tests {\n    use super::{Error, OwnedContractHostRef, OwnedContractInitArgs};\n    use odra::{host::Deployer, prelude::*};\n\n    #[test]\n    fn test_owner_error() {\n        let test_env = odra_test::env();\n        let owner = test_env.get_account(0);\n        let not_an_owner = test_env.get_account(1);\n\n        test_env.set_caller(owner);\n        let init_args = OwnedContractInitArgs {\n            name: "OwnedContract".to_string()\n        };\n        let mut owned_contract = OwnedContractHostRef::deploy(&test_env, init_args);\n\n        test_env.set_caller(not_an_owner);\n        assert_eq!(\n            owned_contract.try_change_name("NewName".to_string()),\n            Err(Error::NotAnOwner.into())\n        );\n    }\n}\n')),(0,a.kt)("p",null,"Each ",(0,a.kt)("inlineCode",{parentName:"p"},"{{ModuleName}}HostRef")," has ",(0,a.kt)("inlineCode",{parentName:"p"},"try_{{entry_point_name}}")," functions that return an ",(0,a.kt)("a",{parentName:"p",href:"https://docs.rs/odra/1.1.0/odra/type.OdraResult.html"},(0,a.kt)("inlineCode",{parentName:"a"},"OdraResult")),".\n",(0,a.kt)("inlineCode",{parentName:"p"},"OwnedContractHostRef")," implements regular entrypoints: ",(0,a.kt)("inlineCode",{parentName:"p"},"name"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"owner"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"change_name"),", and\nand safe its safe version: ",(0,a.kt)("inlineCode",{parentName:"p"},"try_name"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"try_owner"),", ",(0,a.kt)("inlineCode",{parentName:"p"},"try_change_name"),"."),(0,a.kt)("p",null,"In our example, we are calling ",(0,a.kt)("inlineCode",{parentName:"p"},"try_change_name")," and expecting an error to be thrown.\nFor assertions, we are using a standard ",(0,a.kt)("inlineCode",{parentName:"p"},"assert_eq!")," macro. As the contract call returns an ",(0,a.kt)("inlineCode",{parentName:"p"},"OdraError"),",\nwe need to convert our custom error to ",(0,a.kt)("inlineCode",{parentName:"p"},"OdraError")," using ",(0,a.kt)("inlineCode",{parentName:"p"},"Into::into()"),"."),(0,a.kt)("h2",{id:"whats-next"},"What's next"),(0,a.kt)("p",null,"We will learn how to emit and test events using Odra."))}u.isMDXComponent=!0}}]);