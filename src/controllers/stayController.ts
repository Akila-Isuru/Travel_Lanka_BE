import { Request, Response } from "express";
import StayModel from "../models/stayModel";
import DestinationModel from "../models/destinationModel";
import { AuthRequest } from "../middleware/auth";
import cloudinary from "../config/cloudinary";


const parseAmenities = (amenities: any): string[] => {
  if (!amenities) return [];
  if (Array.isArray(amenities)) return amenities;
  if (typeof amenities === "string") {
    if (amenities.trim().startsWith("[")) {
      try {
        return JSON.parse(amenities);
      } catch (e) {
      
      }
    }
    return amenities
      .split(",")
      .map((item: string) => item.trim())
      .filter((item) => item);
  }
  return [];
};

const parseCoordinates = (
  raw: any,
): { type: "Point"; coordinates: number[] } | undefined => {
  if (!raw) return undefined;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (
      parsed &&
      Array.isArray(parsed.coordinates) &&
      parsed.coordinates.length === 2 &&
      parsed.coordinates.every((n: any) => typeof n === "number" && !isNaN(n))
    ) {
      return { type: "Point", coordinates: parsed.coordinates };
    }
  } catch (e) {
    // invalid JSON — ignore
  }
  return undefined;
};

export const getStaysByDestination = async (req: Request, res: Response) => {
  try {
    const { destinationId } = req.params;
    const stays = await StayModel.find({ destinationId }).select("-__v");
    res.status(200).json({ success: true, data: stays });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch stays" });
  }
};

export const getStayBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const stay = await StayModel.findOne({ slug }).populate(
      "destinationId",
      "name slug",
    );
    if (!stay) return res.status(404).json({ message: "Stay not found" });
    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stay" });
  }
};

export const getAllStaysAdmin = async (req: Request, res: Response) => {
  try {
    const stays = await StayModel.find().populate("destinationId", "name slug");
    res.status(200).json({ success: true, data: stays });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stays" });
  }
};

export const createStay = async (req: AuthRequest, res: Response) => {
  const {
    name,
    slug,
    description,
    location,
    destinationId,
    pricePerNight,
    address,
    contactPhone,
    amenities,
    coordinates,
  } = req.body;
  try {
    const destination = await DestinationModel.findById(destinationId);
    if (!destination)
      return res.status(404).json({ message: "Destination not found" });

    const files = req.files as Express.Multer.File[];
    const imageUrls: string[] = [];
    for (const file of files) {
      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = "data:" + file.mimetype + ";base64," + b64;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "stays",
      });
      imageUrls.push(result.secure_url);
    }

    const parsedCoords = parseCoordinates(coordinates);

    const stayData: any = {
      name,
      slug,
      description,
      location,
      destinationId,
      pricePerNight: Number(pricePerNight),
      address,
      contactPhone,
      amenities: parseAmenities(amenities),
      images: imageUrls,
    };

    if (parsedCoords) {
      stayData.coordinates = parsedCoords;
    }

    const stay = new StayModel(stayData);
    await stay.save();
    res.status(201).json({ message: "Stay created", data: stay });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create stay" });
  }
};

export const updateStay = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    slug,
    description,
    location,
    destinationId,
    pricePerNight,
    address,
    contactPhone,
    amenities,
    coordinates,
  } = req.body;
  try {
    const stay = await StayModel.findById(id);
    if (!stay) return res.status(404).json({ message: "Stay not found" });

    if (name) stay.name = name;
    if (slug) stay.slug = slug;
    if (description) stay.description = description;
    if (location) stay.location = location;
    if (destinationId) stay.destinationId = destinationId;
    if (pricePerNight) stay.pricePerNight = Number(pricePerNight);
    if (address) stay.address = address;
    if (contactPhone) stay.contactPhone = contactPhone;
    if (amenities !== undefined) stay.amenities = parseAmenities(amenities);

    const parsedCoords = parseCoordinates(coordinates);
    if (parsedCoords) {
      stay.coordinates = parsedCoords;
    }

   
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const newImageUrls = [...stay.images];
      for (const file of files) {
        const b64 = Buffer.from(file.buffer).toString("base64");
        const dataURI = "data:" + file.mimetype + ";base64," + b64;
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: "stays",
        });
        newImageUrls.push(result.secure_url);
      }
      stay.images = newImageUrls;
    }

    await stay.save();
    res.status(200).json({ message: "Stay updated", data: stay });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update stay" });
  }
};

export const deleteStay = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await StayModel.findByIdAndDelete(id);
    res.status(200).json({ message: "Stay deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete stay" });
  }
};
