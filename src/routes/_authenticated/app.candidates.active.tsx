import {createFileRoute} from '@tanstack/react-router';
import {CandidateList} from '@/features/candidates/CandidateList';
import {candidatesQuery,optionsQuery} from '@/features/candidates/queries';
import {candidateHead} from '@/lib/candidates/head';
export const Route=createFileRoute('/_authenticated/app/candidates/active')({head:()=>candidateHead('Active Candidates','Active candidate journeys and staff ownership in CareerOS.'),loader:({context})=>Promise.all([context.queryClient.ensureQueryData(candidatesQuery({active:true})),context.queryClient.ensureQueryData(optionsQuery)]),component:()=> <CandidateList active/>});
