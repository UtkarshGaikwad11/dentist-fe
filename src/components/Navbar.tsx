"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Phone, Mic, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

import Image from "next/image";

export default function Navbar() {
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.replace("/login");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-300 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative h-14 w-40">
              <Image
                src="/Logo.png"
                alt="Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>


          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-700 transition-colors hover:text-emerald-600"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ✅ Logout button on top right (Desktop) */}
          <div className="hidden md:flex md:items-center">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-[#8bc34a] text-[#8bc34a] hover:text-[#8bc34a]/80 hover:bg-[#8bc34a]/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col space-y-6 pt-6">
                {/* Mobile Logo */}
                <div className="flex items-center space-x-2 px-2">
                  <div className="relative h-10 w-10">
                    <Image
                      src="/Logo.png"
                      alt="Toothpaste Herbal Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-gray-900">
                      Toothpaste
                    </span>
                    <span className="text-sm font-medium text-emerald-600">
                      herbal
                    </span>
                  </div>
                </div>

                {/* Mobile Navigation Links */}
                <nav className="flex flex-col space-y-4">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className="px-2 py-2 text-base font-medium text-gray-700 transition-colors hover:text-emerald-600"
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                {/* Mobile Buttons */}
                <div className="flex flex-col space-y-3 border-t pt-6">
                  <Button
                    variant="outline"
                    className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Call Now
                  </Button>

                  <Button
                    variant="default"
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Voice Appointment
                  </Button>

                  {/* ✅ Logout for Mobile */}
                  <Button
                    variant="outline"
                    className="w-full text-black border-black hover:bg-gray-100"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
