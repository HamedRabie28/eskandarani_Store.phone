import { NextRequest, NextResponse } from 'next/server'
import { customerRegister } from '@/server/services/auth.service'
import { cartService } from '@/server/services/cart.service'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  email: z.string().email('بريد إلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  guestToken: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' }, { status: 400 })
    }

    const { name, email, password, guestToken } = parsed.data
    const result = await customerRegister(name, email, password)

    if (!result) {
      return NextResponse.json({ error: 'فشل إنشاء الحساب' }, { status: 400 })
    }

    // Merge guest cart if token provided
    if (guestToken) {
      await cartService.mergeGuestToUser(guestToken, result.user.id).catch(err => {
        console.error('Failed to merge cart during registration:', err)
      })
    }

    return NextResponse.json({
      user: result.user,
      message: 'تم إنشاء الحساب بنجاح',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'فشل إنشاء الحساب' }, { status: 500 })
  }
}
