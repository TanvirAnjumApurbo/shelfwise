import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import UserProfile from "@/components/UserProfile";

const Header = async () => {
  const session = await auth();

  return (
    <header className="my-10 flex justify-between gap-5">
      <Link href="/">
        <Image src="/icons/logo.svg" alt="logo" width={40} height={40} />
      </Link>

      <ul className="flex flex-row items-center gap-8">
        {session?.user && (
          <>
            <li>
              <nav className="flex items-center gap-6">
                <Link
                  href="/books"
                  className="text-white/80 hover:text-white transition-colors duration-200 font-medium hover:border-b-2 hover:border-purple-500 pb-1"
                >
                  All Books
                </Link>
                <Link
                  href="/my-books"
                  className="text-white/80 hover:text-white transition-colors duration-200 font-medium hover:border-b-2 hover:border-purple-500 pb-1"
                >
                  Borrowed Books
                </Link>
              </nav>
            </li>
            <li>
              <UserProfile
                user={{
                  id: session.user.id!,
                  name: session.user.name!,
                  email: session.user.email!,
                }}
              />
            </li>
          </>
        )}
      </ul>
    </header>
  );
};

export default Header;
