import Image from 'next/image';
import Link from 'next/link';
import { auth } from '@/auth';
import AuthButton from '@/components/AuthButton';

export default async function Home() {
  const session = await auth();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center">
        <h1 className="text-4xl font-bold">オープン掲示板へようこそ</h1>
        <p className="text-lg text-center">
          誰でも自由に投稿できる掲示板です。
          <br />
          {session ? (
            <>ログイン済みです。掲示板を利用できます。</>
          ) : (
            <>ログインして掲示板を利用しましょう。</>
          )}
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          {session ? (
            <Link
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
              href="/board"
            >
              掲示板を開く
            </Link>
          ) : (
            <>
              <Link
                className="rounded-full border border-solid border-blue-500 transition-colors flex items-center justify-center bg-blue-500 text-white gap-2 hover:bg-blue-600 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                href="/auth/login"
              >
                ログイン
              </Link>
              <Link
                className="rounded-full border border-solid border-gray-300 transition-colors flex items-center justify-center bg-white text-gray-700 gap-2 hover:bg-gray-50 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
                href="/auth/register"
              >
                新規登録
              </Link>
            </>
          )}
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="ファイルアイコン"
            width={16}
            height={16}
          />
          学習する
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="ウィンドウアイコン"
            width={16}
            height={16}
          />
          サンプル
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="グローブアイコン"
            width={16}
            height={16}
          />
          nextjs.org へ →
        </a>
      </footer>
    </div>
  );
}
