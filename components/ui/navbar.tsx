'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Show, UserButton, SignInButton, useUser } from '@clerk/nextjs'

const navlist = [
  { header: "Library", href: "/" },
  { header: "Add New", href: "/books/new" },
  { header: 'Pricing' , href: '/subscriptions'}
]
const Navbar = () => {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <header className=' w-full max-w-[1440px] px-10 lg:px-40 z-50 fixed bg-(--bg-primary) '>
      <div className='flex navbar-height items-center justify-between'>
        <Link href={"/"} className='flex gap-0.5 align-middle items-center '>
          <Image src={"/assets/logo.png"} width={42} height={26} alt=''></Image>
          <span className='logo-text'>Bookfied</span>
        </Link>

        <div className='flex items-center gap-5'>
          <nav className='w-fit flex gap-5'>
            {navlist.map(({ header, href }) => {

              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href))

              return (<Link key={header} href={href}
                className={cn("nav-link-base", isActive ? 'nav-link-active' : 'text-black hover:opacity-70')}>
                {header}
              </Link>
              )
            })}
          </nav>

          <div className="flex gap-4">
            <Show when="signed-out">
              <SignInButton mode='modal' />
            </Show>
            <Show when="signed-in">
              <div className='nav-user-link gap-1'>
                <UserButton />
                {user?.firstName && (<Link href={"/subscriptions"} className='nav-user-name'>{user.firstName}</Link>)}
              </div>
            </Show>
          </div>

        </div>
      </div>
    </header>
  )
}

export default Navbar
