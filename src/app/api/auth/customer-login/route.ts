import { NextRequest, NextResponse } from 'next/server'
import { customerLogin } from '@/server/services/auth.service'
import { cartService } from '@/server/services/cart.service'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('بريد إلكتروني غير صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  guestToken: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' }, { status: 400 })
    }

    const { email, password, guestToken } = parsed.data
    const result = await customerLogin(email, password)

    if (!result) {
      return NextResponse.json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }, { status: 401 })
    }

    // Merge guest cart if token provided
    if (guestToken) {
      await cartService.mergeGuestToUser(guestToken, result.user.id).catch(err => {
        console.error('Failed to merge cart during login:', err)
      })
    }

    return NextResponse.json({
      user: result.user,
      message: 'تم تسجيل الدخول بنجاح',
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'فشل تسجيل الدخول' }, { status: 500 })
  }
}
