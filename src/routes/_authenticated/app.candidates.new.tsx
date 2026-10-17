import {createFileRoute} from '@tanstack/react-router';
import {CandidateEditor} from '@/features/candidates/CandidateEditor';
import {optionsQuery} from '@/features/candidates/queries';
import {requirePermission} from '@/lib/auth/guards';
import {candidateHead} from '@/lib/candidates/head';
export const Route=createFileRoute('/_authenticated/app/candidates/new')({beforeLoad:requirePermission('candidates.create'),head:()=>candidateHead('Add Candidate','Create an independent candidate business record in CareerOS.'),loader:({context})=>context.queryClient.ensureQueryData(optionsQuery),component:()=> <CandidateEditor/>});
