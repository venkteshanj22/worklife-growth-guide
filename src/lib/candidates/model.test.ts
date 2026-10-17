import {describe,it,expect} from 'vitest';
import {defaults,recordSchema,ACTIVE_STATUSES,STATUSES,saveSchema} from './model';
const draft={...defaults,full_name:'Test Candidate',primary_mobile:'9876543210',personal_email:'candidate@example.test'};
describe('Candidate Master rules',()=>{
 it('Draft requires name',()=>expect(recordSchema.safeParse({...draft,full_name:''}).success).toBe(false));
 it('Draft requires primary mobile',()=>expect(recordSchema.safeParse({...draft,primary_mobile:''}).success).toBe(false));
 it('Draft requires personal email',()=>expect(recordSchema.safeParse({...draft,personal_email:'invalid'}).success).toBe(false));
 it('Draft requires no login, enrollment or plan',()=>expect(recordSchema.safeParse(draft).success).toBe(true));
 it('Enrolled requires enrollment date',()=>expect(recordSchema.safeParse({...draft,journey_status:'ENROLLED',program_plan:'STANDARD'}).success).toBe(false));
 it('Enrolled requires program plan',()=>expect(recordSchema.safeParse({...draft,journey_status:'ENROLLED',enrollment_date:'2026-10-17'}).success).toBe(false));
 it('Enrolled accepts extensible program choices',()=>expect(recordSchema.safeParse({...draft,journey_status:'ENROLLED',enrollment_date:'2026-10-17',program_plan:'PREMIUM_PLUS'}).success).toBe(true));
 it('Defaults country India',()=>expect(defaults.country).toBe('India'));
 it('Defaults roadmap duration to 60 days',()=>expect(defaults.roadmap_duration).toBe(60));
 it('Uses the exact nine active statuses',()=>expect(ACTIVE_STATUSES).toEqual(['ENROLLED','ASSESSMENT_COMPLETED','PCB_PREPARATION','PCB_APPROVED','ROADMAP_ACTIVE','OPPORTUNITY_READY','OPPORTUNITY_PHASE','SELECTED','ON_HOLD']));
 it('Implements all thirteen journey statuses',()=>expect(STATUSES).toEqual(['DRAFT','ENROLLED','ASSESSMENT_COMPLETED','PCB_PREPARATION','PCB_APPROVED','ROADMAP_ACTIVE','OPPORTUNITY_READY','OPPORTUNITY_PHASE','SELECTED','COMPLETED','ON_HOLD','DISCONTINUED','CANCELLED']));
 it('Allows multiple education records',()=>expect(saveSchema.safeParse({id:null,record:draft,education:[{degree:'B.E.'},{degree:'M.E.'}],employment:[]}).success).toBe(true));
 it('Allows multiple employment records including currently working without end date',()=>expect(saveSchema.safeParse({id:null,record:draft,education:[],employment:[{company_name:'A',currently_working:true},{company_name:'B',currently_working:false}]}).success).toBe(true));
});
