import {describe,it,expect} from 'vitest';
import {can} from '@/lib/rbac/permissions';
const keys=['candidates.view','candidates.create','candidates.edit','candidates.status','candidates.assign','candidates.portal','candidates.view_all','candidates.view_assigned'];
describe('Candidate UI permission rules',()=>{
 it('Candidate role has no staff Candidate Master permissions',()=>{for(const key of keys)expect(can({status:'ACTIVE',role_key:'candidate',permissions:['candidate.self.view']},key)).toBe(false);});
 it('Super Admin can use every Candidate permission',()=>{for(const key of keys)expect(can({status:'ACTIVE',role_key:'super_admin',permissions:[]},key)).toBe(true);});
 it('Assigned-only consultant does not have view_all',()=>expect(can({status:'ACTIVE',role_key:'career_consultant',permissions:['candidates.view','candidates.edit','candidates.view_assigned']},'candidates.view_all')).toBe(false));
 it('Inactive staff cannot access Candidate Master',()=>expect(can({status:'INACTIVE',role_key:'super_admin',permissions:keys},'candidates.view')).toBe(false));
});
