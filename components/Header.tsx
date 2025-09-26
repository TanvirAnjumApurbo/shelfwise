import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import UserProfile from "@/components/UserProfile";

const Header = async () => {
  const session = await auth();

  return (
    <header className="my-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/"
        className="flex items-center gap-3 text-white transition-opacity duration-200 hover:opacity-90"
      >
        <Image
          src="/icons/logo.svg"
          alt="ShelfWise logo"
          width={40}
          height={40}
        />
        <span className="text-2xl font-semibold tracking-wide">ShelfWise</span>
      </Link>

      {session?.user && (
        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:justify-end sm:gap-6">
          <nav className="flex w-full flex-col items-center gap-3 text-base sm:w-auto sm:flex-row sm:gap-6">
            <Link
              href="/books"
              className="text-white/80 transition-colors duration-200 hover:border-b-2 hover:border-purple-500 hover:text-white pb-1 font-medium"
            >
              All Books
            </Link>
            <Link
              href="/my-books"
              className="text-white/80 transition-colors duration-200 hover:border-b-2 hover:border-purple-500 hover:text-white pb-1 font-medium"
            >
              Borrowed Books
            </Link>
            <Link
              href="/status"
              className="text-white/80 transition-colors duration-200 hover:border-b-2 hover:border-purple-500 hover:text-white pb-1 font-medium"
            >
              Status
            </Link>
          </nav>

          <UserProfile
            user={{
              id: session.user.id!,
              name: session.user.name!,
              email: session.user.email!,
            }}
          />
        </div>
      )}
    </header>
  );
};

export default Header;
