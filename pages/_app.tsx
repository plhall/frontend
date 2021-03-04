import type {AppProps} from 'next/app.js';
import Head from 'next/head.js';
import {ChakraProvider, extendTheme} from '@chakra-ui/react';
import Navbar from '../components/navbar';
import * as APIState from '../lib/state-context';

const theme = extendTheme({
	colors: {
		brand: {
			50: '#fffae4',
			100: '#ffeea8',
			200: '#ffdf60',
			300: '#ffcd06',
			400: '#eebe00',
			500: '#d9ae00',
			600: '#c29b00',
			700: '#a78500',
			800: '#836900',
			900: '#4d3e00'
		}
	}
});

function MyApp({Component, pageProps}: AppProps) {
	return (
		<ChakraProvider theme={theme}>
			<APIState.Provider>
				<Head>
					<title>Michigan Tech Courses</title>
					<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

					<link rel="preload" href={`${process.env.NEXT_PUBLIC_API_ENDPOINT!}/instructors`} as="fetch" crossOrigin="anonymous"/>
					<link rel="preload" href={`${process.env.NEXT_PUBLIC_API_ENDPOINT!}/passfaildrop`} as="fetch" crossOrigin="anonymous"/>
					<link rel="preload" href={`${process.env.NEXT_PUBLIC_API_ENDPOINT!}/semesters`} as="fetch" crossOrigin="anonymous"/>
					<link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_THUMBOR_ENDPOINT}/>

					{
						process.env.NODE_ENV === 'production' && (
							<script async defer data-domain="michigantechcourses.com" src="https://plause.maxisom.me/js/plausible.js"/>
						)
					}

					<link rel="apple-touch-icon" sizes="180x180" href="/images/favicon/apple-touch-icon.png"/>
					<link rel="icon" type="image/png" sizes="32x32" href="/images/favicon/favicon-32x32.png"/>
					<link rel="icon" type="image/png" sizes="16x16" href="/images/favicon/favicon-16x16.png"/>
					<link rel="manifest" href="/images/favicon/site.webmanifest"/>
					<link rel="mask-icon" href="/images/favicon/safari-pinned-tab.svg" color="#ffcc01"/>
					<link rel="shortcut icon" href="/images/favicon/favicon.ico"/>
					<meta name="msapplication-TileColor" content="#000000"/>
					<meta name="msapplication-config" content="/images/favicon/browserconfig.xml"/>
					<meta name="theme-color" content="#000000"/>
				</Head>

				<Navbar/>

				<main>
					<Component {...pageProps}/>
				</main>
			</APIState.Provider>
		</ChakraProvider>
	);
}

export default MyApp;
