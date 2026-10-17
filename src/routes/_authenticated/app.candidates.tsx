import {createFileRoute,Outlet} from '@tanstack/react-router';
import {requirePermission} from '@/lib/auth/guards';
export const Route=createFileRoute('/_authenticated/app/candidates')({beforeLoad:requirePermission('candidates.view'),component:()=> <Outlet/>});
