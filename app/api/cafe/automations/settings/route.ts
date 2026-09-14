import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/permissions";
import { assertSameOrigin } from "@/lib/security";
import { getAutomationSettings, setAutomationSetting, type AutomationKey } from "@/lib/automation";
const schema=z.object({key:z.enum(["BIRTHDAY","WIN_BACK_30","FIRST_ORDER","REWARD_READY"]),enabled:z.boolean()});
export async function GET(){try{const s=await requirePermission("AUTOMATIONS");return NextResponse.json(await getAutomationSettings(s.user.cafeId!));}catch{return NextResponse.json({error:"Unauthorized."},{status:401})}}
export async function PUT(req:Request){if(!assertSameOrigin(req))return NextResponse.json({error:"Invalid request origin."},{status:403});try{const s=await requirePermission("AUTOMATIONS");const b=schema.parse(await req.json());return NextResponse.json(await setAutomationSetting(s.user.cafeId!,b.key as AutomationKey,b.enabled));}catch(e){if(e instanceof z.ZodError)return NextResponse.json({error:"Invalid automation setting."},{status:400});return NextResponse.json({error:"Unable to update automation."},{status:500})}}
