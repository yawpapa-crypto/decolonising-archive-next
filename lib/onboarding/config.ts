/** Authoritative question wording shared by the website and authenticated mobile wizard. */
import { MIN_INTERESTS } from "./shared";
export const onboardingConfig = {
  version: 1,
  signup: [
    {id:"email",title:"Enter your email address",label:"Email address",required:true},
    {id:"password",title:"Choose a password",label:"Password",description:"Use at least 12 characters",required:true,minLength:12},
  ],
  questions: [
    {id:"name",title:"Enter your full name",description:"This will be shown on your profile",label:"Full name",required:true,minLength:2,maxLength:80},
    {id:"age",title:"Enter your age",description:"Optional. It won’t be displayed on your profile.",label:"Age",required:false,min:1,max:120},
    {id:"username",title:"Choose a username",description:"Letters, numbers and underscores",label:"Username",required:true,minLength:3,maxLength:24},
    {id:"interests",title:"What would you like to explore?",description:"Choose a few interests to shape your For You feed. You can change these later.",label:"Interests",required:false,minSelected:MIN_INTERESTS,maxSelected:40},
  ],
  actions:{next:"Next",continue:"Continue",skip:"Skip for now",back:"Back"},
} as const;
