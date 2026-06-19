import { Request, Response } from "express";
import DestinationModel from "../models/destinationModel";
import cloudinary from "../config/cloudinary";
import { AuthRequest } from "../middleware/auth";

export const createDestination = async (req: Request, res: Response) => {
  const {
    name,
    slug,
    description,
    location,
    category,
    pricePerNight,
    coordinates,
  } = req.body;

  try {
    
    let parsedCoordinates;
    if (coordinates) {
      try {
        parsedCoordinates =
          typeof coordinates === "string"
            ? JSON.parse(coordinates)
            : coordinates;
      } catch (e) {
        return res.status(400).json({ message: "Invalid coordinates format" });
      }
    }

    const files = req.files as Express.Multer.File[];
    const imageUrls: string[] = [];
    for (const file of files) {
      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = "data:" + file.mimetype + ";base64," + b64;
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "destinations",
      });
      imageUrls.push(result.secure_url);
    }

    const newDest = new DestinationModel({
      name,
      slug,
      description,
      location,
      category,
      pricePerNight,
      images: imageUrls,
      coordinates: parsedCoordinates, 
    });

    const savedDest = await newDest.save();
    res.status(201).json({ message: "Success!", data: savedDest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error uploading images!" });
  }
};

export const getAllDestinations = async (req: Request, res: Response) => {
  try {
    const { search, location, category } = req.query;
    let query: any = {};

    if (search) query.name = { $regex: search, $options: "i" };
    if (location) query.location = { $regex: location, $options: "i" };
    if (category) query.category = category;

    const destinations = await DestinationModel.find(query);
    res.status(200).json({ data: destinations });
  } catch (error) {
    res.status(500).json({ message: "Failed to get Destinations" });
  }
};

export const getDestinationBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    console.log("Fetching destination with slug:", slug);

    const destination = await DestinationModel.findOne({ slug: slug });

    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }

    console.log("Destination found:", destination.name);
    res.status(200).json({ data: destination });
  } catch (error) {
    console.error("Error fetching destination by slug:", error);
    res.status(500).json({ message: "Failed to get destination" });
  }
};

export const updateDestination = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    slug,
    description,
    location,
    category,
    pricePerNight,
    coordinates,
  } = req.body;

  try {
    const destination = await DestinationModel.findById(id);
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }

    if (name) destination.name = name;
    if (slug) destination.slug = slug;
    if (description) destination.description = description;
    if (location) destination.location = location;
    if (category) destination.category = category;
    if (pricePerNight) destination.pricePerNight = pricePerNight;

    
    if (coordinates) {
      try {
        const parsed =
          typeof coordinates === "string"
            ? JSON.parse(coordinates)
            : coordinates;
        if (parsed?.coordinates) {
          destination.coordinates = parsed;
        }
      } catch (e) {
        return res.status(400).json({ message: "Invalid coordinates format" });
      }
    }

    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const newImageUrls: string[] = [...destination.images];
      for (const file of files) {
        const b64 = Buffer.from(file.buffer).toString("base64");
        const dataURI = "data:" + file.mimetype + ";base64," + b64;
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: "destinations",
        });
        newImageUrls.push(result.secure_url);
      }
      destination.images = newImageUrls;
    }

    const updatedDest = await destination.save();
    res.status(200).json({
      message: "Destination updated successfully!",
      data: updatedDest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update destination" });
  }
};

export const deleteDestination = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const destination = await DestinationModel.findByIdAndDelete(id);
    if (!destination) {
      return res.status(404).json({ message: "Destination not found" });
    }

    res.status(200).json({ message: "Destination deleted successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete destination" });
  }
};

export const getNearbyDestinations = async (req: Request, res: Response) => {
  try {
    const { lng, lat, radius = 20 } = req.query;
    const longitude = parseFloat(lng as string);
    const latitude = parseFloat(lat as string);

    if (isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    const radiusInMeters = parseFloat(radius as string) * 1000;

    const nearby = await DestinationModel.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: radiusInMeters,
          spherical: true,
          key: "coordinates",
        },
      },
      {
        $project: {
          name: 1,
          slug: 1,
          images: 1,
          location: 1,
          category: 1,
          pricePerNight: 1,
          ratingsAverage: 1,
          distance: { $divide: ["$distance", 1000] },
          coordinates: 1,
        },
      },
    ]);

    res.status(200).json({ success: true, data: nearby });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch nearby destinations" });
  }
};
