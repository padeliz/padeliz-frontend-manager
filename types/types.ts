import { ImageSourcePropType } from "react-native";

export type FontStyle = {
    color: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
}

export type EventDetails = {
    eventImage: ImageSourcePropType;
    eventName: string;
    date: string;
    location: string;
    price: string;
    activities: string[];
    times: string[];
    eventDescription: string;
    organizerImage: ImageSourcePropType;
    organizerName: string;
    organizerTitle: string;
};

export type DivisionDetails = {
    isActive: boolean;
    isEligible: boolean;
    name: string;
    price: number;
    description: string;
    num_spots: number;
};