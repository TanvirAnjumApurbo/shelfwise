"use client";

import {
  useCallback,
  useEffect,
  useState,
  FormEvent,
  ChangeEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface BookSearchFormProps {
  initialQuery: string;
}

const BookSearchForm = ({ initialQuery }: BookSearchFormProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  const updateQuery = useCallback(
    (nextValue: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (nextValue) {
        params.set("q", nextValue);
      } else {
        params.delete("q");
      }

      const queryString = params.toString();

      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setValue(nextValue);
    updateQuery(nextValue);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleClear = () => {
    setValue("");
    updateQuery("");
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
    >
      <label htmlFor="book-search" className="sr-only">
        Search books
      </label>
      <Input
        id="book-search"
        name="q"
        type="search"
        placeholder="Search by title, author, or genre"
        value={value}
        onChange={handleChange}
        autoComplete="off"
        className="flex-1 border-transparent bg-white/10 text-white placeholder:text-white/60 focus-visible:border-white focus-visible:ring-0"
      />
      {value && (
        <div className="flex gap-2 sm:w-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClear}
            className="w-full bg-white/20 text-white shadow-sm transition-colors hover:bg-white/30 hover:text-white sm:w-auto"
          >
            Clear
          </Button>
        </div>
      )}
    </form>
  );
};

export default BookSearchForm;
