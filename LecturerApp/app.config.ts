

export default {
    expo: {
        name: "Taalomy Lecturer",
        slug: "Taalomy-lecturer",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/taalomy-dark-back.png",
        userInterfaceStyle: "dark",
        newArchEnabled: true,
        splash: {
            image: "./assets/taalomy-splash-padded.png",
            resizeMode: "contain",
            backgroundColor: "#1b1b1b"
        },
        ios: {
            supportsTablet: true,
            appleTeamId: "MKSDG76962",
            bundleIdentifier: "com.Taalomy.lecturer",
            infoPlist: {
                NSAppTransportSecurity: {
                    NSAllowsArbitraryLoads: true
                },
                CFBundleURLTypes: [
                    {
                        CFBundleURLName: "GoogleSignIn",
                        CFBundleURLSchemes: [
                            process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ? `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID.split('.')[0]}` : "com.googleusercontent.apps.790137233772-50d426h6t6206p4428464670295627j6"
                        ]
                    }
                ]
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/taalomy-dark-back.png",
                backgroundColor: "#1b1b1b"
            },
            edgeToEdgeEnabled: true,
            package: "com.Taalomy.lecturer"
        },
        web: {
            favicon: "./assets/taalomy-dark-back.png",
            bundler: "metro"
        },
        extra: {
            supportsRTL: true,
            eas: {
                projectId: "715ea840-04b6-4355-b2b0-3d624ac83d66"
            }
        },
        plugins: [
            "expo-router",
            "expo-secure-store",
            "expo-localization"
        ],
        scheme: "Taalomy-lecturer",
        sdkVersion: "54.0.0",
        experiments: {
            typedRoutes: true
        }
    }
};
