import { Session } from "next-auth";
import AdminUserProfile from "./UserProfile";

const Header = ({ session }: { session: Session }) => {
  return (
    <header className="admin-header">
      <div>
        <h2 className="text-2xl font-semibold text-dark-400">
          Welcome, {session?.user?.name}
        </h2>
        <p className="text-base text-slate-500">
          Monitor all of your users and books here
        </p>
      </div>

      <div className="flex items-center">
        <AdminUserProfile
          user={{
            id: session?.user?.id!,
            name: session?.user?.name!,
            email: session?.user?.email!,
          }}
        />
      </div>
    </header>
  );
};
export default Header;
